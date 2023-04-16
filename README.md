# OZ Calendar Plugin

If you like the see your notes on a Calendar and easily find them using a certain date, you are at the right place. This plugin is created to help users easily view notes on Calendar using any YAML key or File Name with a custom date value. You define the YAML key and Date Format to be used. Or you can simply use the file name with your custom date format. Follow the **Configure** steps depending on your choice and you are ready to go.

## Sample View

<img src="https://github.com/ozntel/oz-calendar/blob/master/img/OZ-Calendar-Sample-Img-01.png?raw=true" width="250px"/>

## Configure

> IMPORTANT: Please make sure that you check the date formatting of the library, which is used by this plugin following [Day.js Date Format Link](https://day.js.org/docs/en/display/format).

### 01 YAML Option as Date Source

1. Go to the plugin settings
2. Define the **YAML** key you want to use as a date field. The default key is **created**
3. Define the **Date Format** you are using within **YAML**. The default date format is **YYYY-MM-DD hh:mm:ss**
4. After these changes, use **Reload Plugin** option to activate the changes in the vault.

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
4. After these changes, use **Reload Plugin** option to activate the changes in the vault.

> Both YAML and File Name options can include additional characters in the file name. As long as the custom date format defined in the plugin settings is at the beginning of the YAML key or File Name, the plugin will be smart enough to parse only the beginning of the key/filename. For instance, if you have a file name '**2023-03-10 This is the file**' and your date format defined in the plugin settings is **YYYY-MM-DD**, it will be parsed just fine in the calendar.

## Create File Option

You can use the **Plus(+)** icon within the calendar view to add a new note with the default YAML key and date format.

You can define this in the plugin settings:

-   The **Default Folder** the plugin is supposed to save the new file. The plugin also gives you an option to enable/disable destination folder selection during each note creation. The destination folder is always going to default to the one defined in the plugin settings but can be adjusted for single notes.
-   And the **File Prefix Date Format** in case you prefer your file names to start with a certain date format
-   You can right-click any date in the calendar view to create a note for a certain date
-   The plus icon is defaulted to create a note for today

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
