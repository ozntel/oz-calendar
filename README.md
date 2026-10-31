# OZ Calendar Plugin

If you like the see your notes on a Calendar and easily find them using a certain date, you are at the right place. This plugin is created to help users easily view notes on Calendar using any YAML key or File Name with a custom date value. You define the YAML key and Date Format to be used. Or you can simply use the file name with your custom date format. Follow the **Configure** steps depending on your choice and you are ready to go.

## Sample View

<img src="https://github.com/ozntel/oz-calendar/blob/master/img/OZ-Calendar-Sample-Img-01.png?raw=true" width="250px"/>

## Configure

> IMPORTANT: Please make sure that you check the date format tokens supported by the plugin following [Moment.js Date Format Link](https://momentjs.com/docs/#/displaying/format/) (e.g. `YYYY-MM-DD`, `D MMMM YYYY`, `HH:mm`).

### Dates in Your Language

By default, month and weekday names (e.g. `MMMM`, `ddd`) follow the language set in Obsidian (**Settings → General → Language**). This applies to the calendar view, new note titles, the YAML date and the dates read from your notes. If you prefer English names regardless of the Obsidian language, disable **Use Obsidian Language for Dates** in the plugin settings.

> If your date format contains month or weekday names and your existing notes use English names, keep **Use Obsidian Language for Dates** disabled, otherwise those notes won't be recognised.

### 01 YAML Option as Date Source

1. Go to the plugin settings
2. Define the **YAML** key you want to use as a date field. The default key is **created**
3. Define the **Date Format** you are using within **YAML**. The default date format is **YYYY-MM-DD HH:mm:ss**

Changes are applied right away, there is no need to reload the plugin.

For the ones that don't know how to add a YAML key, see the following:

```md
---
created: 2023-03-10 09:48:22
---
```

You can use any YAML key instead of "created" and any date format value for the key.

### 02 File Name Option as Date Source

The default date source is the YAML Key ("created") as mentioned above. If you want to use the file name as date source that feeds the calendar:

1. Go to the plugin settings
2. Change Date Source from **YAML** to **File Name** since the plugin has **YAML** key as a default date source
3. Make sure that you adjust the default date format (**Important**: The default date format has special characters that is not supported for file name like colon that needs to be adjusted for File Name option)

Changes are applied right away, there is no need to reload the plugin.

> Both YAML and File Name options can include additional characters in the file name. As long as the custom date format defined in the plugin settings is at the beginning of the YAML key or File Name, the plugin will be smart enough to parse only the beginning of the key/filename. For instance, if you have a file name '**2023-03-10 This is the file**' and your date format defined in the plugin settings is **YYYY-MM-DD**, it will be parsed just fine in the calendar.

## Create File Option

You can use the **Plus(+)** icon within the calendar view to add a new note with the default YAML key and date format.

You can define this in the plugin settings:

-   The **Default Folder** the plugin is supposed to save the new file. The plugin also gives you an option to enable/disable destination folder selection during each note creation. The destination folder is always going to default to the one defined in the plugin settings but can be adjusted for single notes.
-   And the **File Prefix Date Format** in case you prefer your file names to start with a certain date format
-   You can right-click any date in the calendar view to create a note for a certain date
-   The plus icon is defaulted to create a note for today
-   An optional **New Note Template** (see [Templates](#templates))

## Templates

You can set a template file for the new notes (**New Note Template**) and for the weekly notes (**Weekly Note Template**) under the **Templates** section of the plugin settings. Which syntax is processed depends on whether the **Templater** plugin is enabled. The settings page shows which one applies to your vault and warns you if a template can't be fully processed.

| | `{{date}}`, `{{title}}`, `{{time}}`, `{{date:FORMAT}}` | `<% ... %>` Templater commands |
| --- | --- | --- |
| Templater enabled | Filled in by OZ Calendar (first) | Run by Templater |
| Templater not enabled | Filled in by OZ Calendar | Left as plain text |

The `{{...}}` syntax is the same as the core **Templates** plugin, but it is filled in by OZ Calendar, so it works without the core Templates plugin and doesn't depend on its settings.


-   Core Templates variables are always replaced: `{{title}}`, `{{date}}`, `{{time}}`, `{{date:FORMAT}}` and `{{time:FORMAT}}` (e.g. `{{date:dddd, D MMMM YYYY}}`). The date is the **date of the note** (the day you create the note for, or the first day of the week for weekly notes), not today.
-   If the **Templater** plugin is enabled, Templater commands (`<% ... %>`) are processed as well. Note that `tp.date.now()` is the current date. To use the date of the note, use `{{date}}` (it is replaced before Templater runs), e.g. `<% tp.date.now("YYYY-MM-DD", 7, "{{date}}", "YYYY-MM-DD") %>` for a week after the note date.
-   If the date source is YAML, the YAML key with the date is added to the note's frontmatter, unless the template already has it.

## Weekly Notes

Enable **Weekly Notes** and **Show Week Numbers** in the plugin settings to use the week numbers of the calendar:

-   Click on a week number to open the weekly note of that week. If it doesn't exist yet, it will be created. Use **Cmd/Ctrl + Click** to open it in a new tab.
-   Week numbers with an existing weekly note are shown bold and underlined.
-   **Weekly Note Format**: leave it empty to use the format matching the Calendar Type (ISO 8601: `GGGG-[W]WW` → `2026-W44`, US: `gggg-[W]ww`).
-   **Weekly Notes Folder**: leave it empty to use the default folder of the new notes. If you set a separate folder, the weekly notes are not shown as dots on the days (you can change this with **Hide Weekly Notes from Days**).
-   **Weekly Note Template**: optional template file, see [Templates](#templates). `{{date}}` is the first day of the week.

Commands: **Open This Week's Note**, **Open Previous Week's Note** and **Open Next Week's Note**.

## Plugin Commands

### Day Navigation

You can use directly **Go to Previous Day**, **Go to Next Day** and **Go to Today** commands to navigate between dates. You can also assign hotkey to these commands to change the active date easily from your keyboard.

### New Note Creation

You can use the **Create a New Note** command to trigger the create a new note action customized for the plugin. Same as day navigation, you can assign hotkey to this command for easy keyboard navigation.

## Style Settings Plugin Support

You can customize some of the calendar style settings using the **Style Settings Plugin**.

## Contact

If you have any issues or you have any suggestions, please feel free to reach me out directly using the contact page of my website [ozan.pl/contact/](https://www.ozan.pl/contact/) or directly to <me@ozan.pl>.

## Support

If you are enjoying the plugin then you can support my work and enthusiasm by buying me a coffee:

<a href='https://ko-fi.com/L3L356V6Q' target='_blank'>
    <img height='48' style='border:0px;height:48px;' src='https://cdn.ko-fi.com/cdn/kofi1.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' />
</a>
