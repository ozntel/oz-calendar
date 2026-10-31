import { Notice, TFile, TFolder, normalizePath } from 'obsidian';
import OZCalendarPlugin from '../main';

/**
 * Replaces the core Templates plugin variables. Unlike the core plugin, {{date}} and {{time}} are the date
 * of the note (e.g. the clicked day or the first day of the week) instead of the current date
 * @param plugin
 * @param content Template content
 * @param date Date of the note
 * @param title File name of the note without extension
 */
export const fillTemplateVariables = (plugin: OZCalendarPlugin, content: string, date: Date, title: string): string => {
	return content
		.replace(/{{\s*title\s*}}/gi, title)
		.replace(/{{\s*(date|time)\s*(?::(.*?))?}}/gi, (_match, type: string, format?: string) => {
			const defaultFormat = type.toLowerCase() === 'date' ? 'YYYY-MM-DD' : 'HH:mm';
			return plugin.formatDate(date, format && format.trim() !== '' ? format.trim() : defaultFormat);
		});
};

const getTemplaterPlugin = (plugin: OZCalendarPlugin): any => {
	// @ts-ignore
	const plugins = plugin.app.plugins;
	if (!plugins?.enabledPlugins?.has('templater-obsidian')) return null;
	return plugins.plugins['templater-obsidian'] ?? null;
};

/**
 * Returns the Templater plugin's templater instance if Templater is installed and enabled
 * @param plugin
 */
const getTemplater = (plugin: OZCalendarPlugin): any => {
	const templater = getTemplaterPlugin(plugin)?.templater;
	return templater && typeof templater.create_new_note_from_template === 'function' ? templater : null;
};

export const isTemplaterEnabled = (plugin: OZCalendarPlugin): boolean => getTemplater(plugin) !== null;

/**
 * Returns the templates folder of Templater if enabled, otherwise the one of the core Templates plugin
 * @param plugin
 */
export const getTemplatesFolder = (plugin: OZCalendarPlugin): string | null => {
	const templaterFolder = getTemplaterPlugin(plugin)?.settings?.templates_folder;
	if (templaterFolder) return normalizePath(templaterFolder);
	// @ts-ignore
	const coreTemplates = plugin.app.internalPlugins?.getPluginById?.('templates');
	const coreFolder = coreTemplates?.enabled ? coreTemplates.instance?.options?.folder : null;
	return coreFolder ? normalizePath(coreFolder) : null;
};

const hasTemplaterCommands = (content: string): boolean => /<%[\s\S]*?%>/.test(content);

/**
 * Checks the template file and returns a warning to show to the user, or null if the template is fine
 * @param plugin
 * @param templatePath
 */
export const checkTemplate = async (plugin: OZCalendarPlugin, templatePath: string): Promise<string | null> => {
	if (!templatePath) return null;
	const templateFile = plugin.app.vault.getAbstractFileByPath(normalizePath(templatePath));
	if (!(templateFile instanceof TFile)) return 'File not found in the vault.';
	if (!isTemplaterEnabled(plugin) && hasTemplaterCommands(await plugin.app.vault.cachedRead(templateFile))) {
		return "This template has Templater commands (<% %>), but Templater isn't enabled. They will be left as text.";
	}
	return null;
};

// Show the Templater warning during note creation only once per session
let templaterWarningShown = false;

/**
 * Creates a new note in the folder using the template file (optional). Core Templates variables are
 * always replaced, Templater commands are processed if Templater is enabled. The frontmatter values
 * are added to the note unless the template already defines them
 * @returns the created file
 */
export const createNoteFromTemplate = async (params: {
	plugin: OZCalendarPlugin;
	folder: TFolder;
	fileName: string;
	date: Date;
	templatePath: string;
	frontmatter?: Record<string, string>;
}): Promise<TFile> => {
	const { plugin, folder, fileName, date, templatePath, frontmatter } = params;
	const { app } = plugin;

	const templateFile = templatePath ? app.vault.getAbstractFileByPath(normalizePath(templatePath)) : null;
	if (templatePath && !(templateFile instanceof TFile)) {
		new Notice(`Template couldnt be found in the Vault: ${templatePath}`);
	}

	// No template: keep the plain note with the date YAML
	if (!(templateFile instanceof TFile)) {
		// @ts-ignore
		const newFile: TFile = await app.fileManager.createNewMarkdownFile(folder, fileName);
		const yaml = Object.entries(frontmatter ?? {}).map(([key, value]) => `${key}: ${value}`);
		if (yaml.length > 0) await app.vault.modify(newFile, ['---', ...yaml, '---'].join('\n'));
		return newFile;
	}

	const content = fillTemplateVariables(plugin, await app.vault.cachedRead(templateFile), date, fileName);

	let newFile: TFile | undefined;
	const templater = getTemplater(plugin);
	if (!templater && hasTemplaterCommands(content) && !templaterWarningShown) {
		templaterWarningShown = true;
		new Notice("The template has Templater commands (<% %>), but Templater isn't enabled. They are left as text.");
	}
	if (templater) {
		try {
			// Templater creates the file and processes its commands. It also marks the file as pending,
			// so "Trigger Templater on new file creation" doesn't run the commands a second time
			newFile = await templater.create_new_note_from_template(content, folder, fileName, false);
		} catch (e) {
			console.error('OZ Calendar: Templater failed to process the template', e);
			new Notice('Templater failed to process the template, the note is created without Templater');
		}
	}
	if (!newFile) {
		// @ts-ignore
		newFile = (await app.fileManager.createNewMarkdownFile(folder, fileName)) as TFile;
		await app.vault.modify(newFile, content);
	}

	if (frontmatter && Object.keys(frontmatter).length > 0) {
		await app.fileManager.processFrontMatter(newFile, (fm) => {
			for (const [key, value] of Object.entries(frontmatter)) {
				if (!(key in fm)) fm[key] = value;
			}
		});
	}

	return newFile;
};
