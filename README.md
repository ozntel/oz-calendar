# OZ Calendar Plugin

If you like the see your notes on a Calendar and easily find them using a certain date, you are at the right place. This plugin is created to help users easily view notes on Calendar using any YAML key with a custom date value. You define the YAML key and Date Format to be used. Follow the **Configure** steps and you are ready to go.

## Sample View

<img src="https://github.com/ozntel/oz-calendar/blob/master/img/OZ-Calendar-Sample-Img-01.png?raw=true" width="250px"/>

## Configure

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

## Create File Option

You can use the **Plus(+)** icon within the calendar view to add a new note with the default YAML key and date format.

You can define this in the plugin settings:

-   The **Default Folder** the plugin is supposed to save the new file. The plugin also gives you an option to enable/disable destination folder selection during each note creation. The destination folder is always going to default to the one defined in the plugin settings but can be adjusted for single notes.
-   And the **File Prefix Date Format** in case you prefer your file names to start with a certain date format
-   You can right-click any date in the calendar view to create a note for a certain date
-   The plus icon is defaulted to create a note for today

## Style Settings Plugin Support

You can customize some of the calendar style settings using the **Style Settings Plugin**.

## Contact

If you have any issues or you have any suggestions, please feel free to reach me out directly using the contact page of my website [ozan.pl/contact/](https://www.ozan.pl/contact/) or directly to <me@ozan.pl>.

## Support

If you are enjoying the plugin then you can support my work and enthusiasm by buying me a coffee:

<a href='https://ko-fi.com/L3L356V6Q' target='_blank'>
    <img height='48' style='border:0px;height:48px;' src='https://cdn.ko-fi.com/cdn/kofi1.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' />
</a>
