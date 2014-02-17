async = require 'async'
extend = require 'extend'
path = require 'path'
fs = require 'fs'
svgo =  require 'svgo'
svg2png = require 'svg2png'
temp = require 'temp'
xml2js = require 'xml2js'

trycatch = (fn) -> try fn() catch

baseNameNoExt = (filePath) ->
    baseName = path.basename(filePath)
    ext = path.extname(filePath)
    baseName[...baseName.length-ext.length]

lowercaseBaseNameNoExt = (filePath) ->
    baseNameNoExt(filePath)
        .replace(/[^-_A-Za-z0-9]/g, '')
        .toLowerCase()

defaultCssSelector = (svgPath, variant) ->
    base = lowercaseBaseNameNoExt(svgPath)
    selector = variant.selector or ''
    ".icon-#{base}#{selector}"

changeExt = (fromPath, toExt) ->
    toPath = fromPath.split('.', 2)[0] + toExt

# Optimize an SVG string.
optimizeSvg = (svgStr, done) ->
    o = new svgo()
    o.optimize svgStr, (res) ->
        done(null, res.data)

# Convert SVG string to CSS data URI.
svgStrToUri = (svgStr) ->
    base64 = (new Buffer(svgStr)).toString('base64')
    "data:image/svg+xml;base64,#{base64}"

# Generate the PNG file name for an icon variant,
pngName = (svgPath, variant) ->
    filePath = baseNameNoExt(svgPath)
    if variant.name?
        filePath += "-#{variant.name}"
    filePath += '.png'

# Read dimensions from SVG file or fallback to defaults.
svgDims = (svgStr, opts, done) ->
    xml2js.parseString svgStr, (err, obj) ->
        width = obj?.svg?.$?.width or opts.defaultWidth
        height = obj?.svg?.$?.width or opts.defaultHeight
        done(null, width: width, height: height)

# Generate CSS source for an icon variant.
genCss = (svgPath, variant, opts, done) ->
    sep = if /\/$/.test(opts.cssUrlPrefix) then '' else '/'
    pngUrl = opts.cssUrlPrefix + sep + pngName(svgPath, variant)
    svgDims variant.svgStr, opts, (err, dims) ->
        css = """
        #{opts.cssSelector(svgPath, variant)} {
            width: #{dims.width}px;
            height: #{dims.height}px;
            background-size: contain;
            background-repeat: no-repeat;
            background-image: url(#{pngUrl});
            background-image: url(#{svgStrToUri(variant.svgStr)}), none;
        }
        """
        done(null, css)

# Convert SVG string to PNG file.
svgToPng = (svgStr, pngPath, done) ->
    # Note that PhantomJS requires a file with .svg extension.
    tempPath = temp.path suffix: '.svg'
    fs.writeFile tempPath, svgStr, (err) ->
        if err then return done(err)
        svg2png tempPath, pngPath, (err) ->
            fs.unlink(tempPath)
            done(err)

iconizeSingle = (svgPath, opts, done = (->)) ->

    fs.readFile svgPath, (err, svgBuf) ->
        if err then return done(err)

        # Some of the operations below
        # require a string, not a buffer.
        svgStr = svgBuf.toString()

        # Generate the icon variants.
        iconVariants = opts.variants.map (v) ->
            name: v.name
            selector: v.selector
            svgStr: v.transform(svgStr)

        # Treat the original version as a variant.
        iconVariants.unshift
            name: null
            selector: null
            svgStr: svgStr

        # Optimize the SVG files.
        fn = (v, done) ->
            optimizeSvg v.svgStr, (err, optStr) ->
                v.svgStr = optStr
                done(null)
        async.eachSeries iconVariants, fn, (err) ->
            if err then return done(err)

            # Generate CSS.
            genCssFn = (v, done) ->
                genCss(svgPath, v, opts, done)
            async.mapSeries iconVariants, genCssFn, (err, cssList) ->
                if err then return done(err)
                css = cssList.join('\n')

                # Generate the PNG files.
                genPngFn = (v, done) ->
                    pngPath = path.join opts.pngDir, pngName(svgPath, v)
                    svgToPng(v.svgStr, pngPath, done)
                async.eachSeries iconVariants, genPngFn, (err) ->
                    if err then return done(err)
                    done(null, css)

iconizeAll = (pathList, opts, done = (->)) ->

    opts = extend(defaultOptions, opts)

    unless opts.cssUrlPrefix? then opts.cssUrlPrefix = opts.pngDir

    # Create PNG output directory, if required.
    trycatch -> fs.mkdirSync opts.pngDir

    fn = (path, done) ->
        iconizeSingle(path, opts, done)

    async.mapSeries pathList, fn, (err, cssList) ->
        if err then return done(err)
        cssData = cssList.join '\n'
        fs.writeFile opts.cssPath, cssData, done

defaultOptions =
    defaultWidth: 32
    defaultHeight: 32
    cssPath: 'icons.css'
    pngDir: 'png'
    cssSelector: defaultCssSelector
    variants: []

module.exports =
    iconize: iconizeAll
