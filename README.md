# iconize

Converts a bunch of SVG icons to CSS data URLs with PNG fallbacks. Inspired by [grunticon](https://github.com/filamentgroup/grunticon), but simpler and not requiring grunt.

## Usage

### iconize(files, options, done)

Takes an array of file paths and an options object. Available options are:

  * *defaultWidth*: default icon width in pixels, when unspecified by the SVG file. The default is `32`.

  * *defaultHeight*: default icon height in pixels, when unspecified by the SVG file. The default is `32`.

  * *cssPath*: path to generated CSS file. The default is `icons.css`.

  * *pngDir*: path to the directory where PNG files are placed, which will be created if nonexistent. The default is `png`.

  * *cssUrlPrefix*: path to PNG files used by CSS URLs. By default, the value of *pngDir* is used.

  * *cssSelector*: a function taking an SVG path and a variant (see below) as arguments, and returning the CSS selector for the variant. The default is `.icon-#{base}#{selector}`, where

    * *base* is the basename of the SVG path, converted to lowercase, and with all characters other than letters, digits, hyphen and underscore removed.

    * *selector* is *variant.selector*.

  * *variantsOnly*: if true, only build the specified variants (see below). By default, the unmodified icon is also built.

  * *variants*: a (possibly empty) array of objects with keys:
    * *name*: variant name to be appended to PNG file names.
    * *selector*: string to be appended to the CSS selector for this variant.
    * *transform*: a function taking an SVG string and returning another SVG string.

Variants allow the creation of alternative versions of the icons by transforming the SVG (e.g., change the color on hover).
