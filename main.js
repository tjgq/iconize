// Generated by CoffeeScript 1.7.1
(function() {
  var async, baseNameNoExt, changeExt, defaultOptions, defaultPngSelector, defaultSvgSelector, extend, fs, genCss, iconizeAll, iconizeSingle, lowercaseBaseNameNoExt, optimizeSvg, path, pngName, svg2png, svgDims, svgStrToUri, svgToPng, svgo, temp, trycatch, xml2js;

  async = require('async');

  extend = require('extend');

  path = require('path');

  fs = require('fs');

  svgo = require('svgo');

  svg2png = require('svg2png');

  temp = require('temp');

  xml2js = require('xml2js');

  trycatch = function(fn) {
    try {
      return fn();
    } catch (_error) {

    }
  };

  baseNameNoExt = function(filePath) {
    var baseName, ext;
    baseName = path.basename(filePath);
    ext = path.extname(filePath);
    return baseName.slice(0, baseName.length - ext.length);
  };

  lowercaseBaseNameNoExt = function(filePath) {
    return baseNameNoExt(filePath).replace(/[^-_A-Za-z0-9]/g, '').toLowerCase();
  };

  defaultSvgSelector = function(svgPath, variant) {
    var base, selector;
    base = lowercaseBaseNameNoExt(svgPath);
    selector = variant.selector || '';
    return ".svg .icon-" + base + selector;
  };

  defaultPngSelector = function(svgPath, variant) {
    var base, selector;
    base = lowercaseBaseNameNoExt(svgPath);
    selector = variant.selector || '';
    return ".no-svg .icon-" + base + selector;
  };

  changeExt = function(fromPath, toExt) {
    var toPath;
    return toPath = fromPath.split('.', 2)[0] + toExt;
  };

  optimizeSvg = function(svgStr, done) {
    var o;
    o = new svgo();
    return o.optimize(svgStr, function(res) {
      return done(null, res.data);
    });
  };

  svgStrToUri = function(svgStr) {
    var base64;
    base64 = (new Buffer(svgStr)).toString('base64');
    return "data:image/svg+xml;base64," + base64;
  };

  pngName = function(svgPath, variant) {
    var filePath;
    filePath = baseNameNoExt(svgPath);
    if (variant.name != null) {
      filePath += "-" + variant.name;
    }
    return filePath += '.png';
  };

  svgDims = function(svgStr, opts, done) {
    return xml2js.parseString(svgStr, function(err, obj) {
      var height, width, _ref, _ref1, _ref2, _ref3;
      width = (obj != null ? (_ref = obj.svg) != null ? (_ref1 = _ref.$) != null ? _ref1.width : void 0 : void 0 : void 0) || opts.defaultWidth;
      height = (obj != null ? (_ref2 = obj.svg) != null ? (_ref3 = _ref2.$) != null ? _ref3.width : void 0 : void 0 : void 0) || opts.defaultHeight;
      return done(null, {
        width: width,
        height: height
      });
    });
  };

  genCss = function(svgPath, variant, opts, done) {
    var pngUrl, sep;
    sep = /\/$/.test(opts.cssUrlPrefix) ? '' : '/';
    pngUrl = opts.cssUrlPrefix + sep + pngName(svgPath, variant);
    return svgDims(variant.svgStr, opts, function(err, dims) {
      var css;
      css = "" + (opts.svgSelector(svgPath, variant)) + " {\n    width: " + dims.width + "px;\n    height: " + dims.height + "px;\n    background-size: " + dims.width + "px " + dims.height + "px;\n    background-repeat: no-repeat;\n    background-image: url(" + (svgStrToUri(variant.svgStr)) + ");\n}\n" + (opts.pngSelector(svgPath, variant)) + " {\n    width: " + dims.width + "px;\n    height: " + dims.height + "px;\n    background-size: " + dims.width + "px " + dims.height + "px;\n    background-repeat: no-repeat;\n    background-image: url(" + pngUrl + ");\n}";
      return done(null, css);
    });
  };

  svgToPng = function(svgStr, pngPath, done) {
    var tempPath;
    tempPath = temp.path({
      suffix: '.svg'
    });
    return fs.writeFile(tempPath, svgStr, function(err) {
      if (err) {
        return done(err);
      }
      return svg2png(tempPath, pngPath, function(err) {
        fs.unlink(tempPath);
        return done(err);
      });
    });
  };

  iconizeSingle = function(svgPath, opts, done) {
    if (done == null) {
      done = (function() {});
    }
    return fs.readFile(svgPath, function(err, svgBuf) {
      var fn, iconVariants, svgStr;
      if (err) {
        return done(err);
      }
      svgStr = svgBuf.toString();
      iconVariants = opts.variants.map(function(v) {
        return {
          name: v.name,
          selector: v.selector,
          svgStr: v.transform(svgStr)
        };
      });
      if (!opts.variantsOnly) {
        iconVariants.unshift({
          name: null,
          selector: null,
          svgStr: svgStr
        });
      }
      fn = function(v, done) {
        return optimizeSvg(v.svgStr, function(err, optStr) {
          v.svgStr = optStr;
          return done(null);
        });
      };
      return async.eachSeries(iconVariants, fn, function(err) {
        var genCssFn;
        if (err) {
          return done(err);
        }
        genCssFn = function(v, done) {
          return genCss(svgPath, v, opts, done);
        };
        return async.mapSeries(iconVariants, genCssFn, function(err, cssList) {
          var css, genPngFn;
          if (err) {
            return done(err);
          }
          css = cssList.join('\n');
          genPngFn = function(v, done) {
            var pngPath;
            pngPath = path.join(opts.pngDir, pngName(svgPath, v));
            return svgToPng(v.svgStr, pngPath, done);
          };
          return async.eachSeries(iconVariants, genPngFn, function(err) {
            if (err) {
              return done(err);
            }
            return done(null, css);
          });
        });
      });
    });
  };

  iconizeAll = function(pathList, opts, done) {
    var fn;
    if (done == null) {
      done = (function() {});
    }
    opts = extend(defaultOptions, opts);
    if (opts.cssUrlPrefix == null) {
      opts.cssUrlPrefix = opts.pngDir;
    }
    trycatch(function() {
      return fs.mkdirSync(opts.pngDir);
    });
    fn = function(path, done) {
      return iconizeSingle(path, opts, done);
    };
    return async.mapSeries(pathList, fn, function(err, cssList) {
      var cssData;
      if (err) {
        return done(err);
      }
      cssData = cssList.join('\n');
      return fs.writeFile(opts.cssPath, cssData, done);
    });
  };

  defaultOptions = {
    defaultWidth: 32,
    defaultHeight: 32,
    cssPath: 'icons.css',
    pngDir: 'png',
    svgSelector: defaultSvgSelector,
    pngSelector: defaultPngSelector,
    variantsOnly: false,
    variants: []
  };

  module.exports = {
    iconize: iconizeAll
  };

}).call(this);
