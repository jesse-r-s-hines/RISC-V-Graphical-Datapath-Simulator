// see https://github.com/svg/svgo

module.exports = {
    // js2svg: {
    //     indent:  4,
    //     pretty: true,
    // },
    multipass: true,
    plugins: [
        // Optimizations
        // Note: since we are manipulating datapath.svg via javascript we have to be careful which optimizations we use.
        //       datapath.svg has unused defs and hidden/empty elements which will be used in javscript, so we can't remove
        //       them, and we can't change the structure of the SVG much.

        "cleanupAttrs",                   // cleanup attributes from newlines, trailing, and repeating spaces
        // "mergeStyles",                    // merge multiple style elements into one
        // "inlineStyles",                // move and merge styles from <style> elements to element style attributes
        "removeDoctype",                  // remove doctype declaration
        "removeXMLProcInst",              // remove XML processing instructions
        "removeComments",                 // remove comments
        "removeMetadata",                 // remove <metadata>
        "removeTitle",                    // remove <title>
        "removeDesc",                     // remove <desc>
        // "removeUselessDefs",           // remove elements of <defs> without id
        // "removeXMLNS",                 // removes the xmlns attribute (for inline SVG)
        "removeEditorsNSData",            // remove editors namespaces, elements, and attributes
        "removeEmptyAttrs",               // remove empty attributes
        // "removeHiddenElems",           // remove hidden elements
        // "removeEmptyText",             // remove empty Text elements
        // "removeEmptyContainers",       // remove empty Container elements
        // "removeViewBox",               // remove viewBox attribute when possible
        // "cleanupEnableBackground",     // remove or cleanup enable-background attribute when possible
        {
            name: "minifyStyles", // minify <style> elements content with CSSO 
            // don't remove unused classes or do fancy restructuring since styles may refer to classes added in the JS
            // See https://github.com/css/csso#minifysource-options for more options
            params: {usage: false, restructure: false},
        },
        // "convertStyleToAttrs",         // convert styles into attributes
        "convertColors",                  // convert colors (from rgb() to #rrggbb, from #rrggbb to #rgb)
        "convertPathData",                // convert Path data to relative or absolute (whichever is shorter), convert one segment to another, trim useless delimiters, smart rounding, and much more
        "convertTransform",               // collapse multiple transforms into one, convert matrices to the short aliases, and much more
        "removeUnknownsAndDefaults",      // remove unknown elements content and attributes, remove attributes with default values
        "removeNonInheritableGroupAttrs", // remove non-inheritable group's "presentation" attributes
        "removeUselessStrokeAndFill",     // remove useless stroke and fill attributes
        "removeUnusedNS",                 // remove unused namespaces declaration
        // "prefixIds",                   // prefix IDs and classes with the SVG filename or an arbitrary string
        // "cleanupIDs",                  // remove unused and minify used IDs
        "cleanupNumericValues",           // round numeric values to the fixed precision, remove default px units
        // "cleanupListOfValues",         // round numeric values in attributes that take a list of numbers (like viewBox or enable-background)
        "moveElemsAttrsToGroup",          // move elements' attributes to their enclosing group
        "moveGroupAttrsToElems",          // move some group attributes to the contained elements
        // "collapseGroups",              // collapse useless groups
        // "removeRasterImages",          // remove raster images
        // "mergePaths",                  // merge multiple Paths into one
        // "convertShapeToPath",          // convert some basic shapes to <path>
        // "convertEllipseToCircle",      // convert non-eccentric <ellipse> to <circle>
        "sortAttrs",                      // sort element attributes for epic readability
        "sortDefsChildren",               // sort children of <defs> in order to improve compression
        "removeDimensions",               // remove width/height and add viewBox if it's missing (opposite to removeViewBox, disable it first)
        // "removeAttrs",                 // remove attributes by pattern
        // "removeAttributesBySelector",  // removes attributes of elements that match a CSS selector
        // "removeElementsByAttr",        // remove arbitrary elements by ID or className
        // "addClassesToSVGElement",      // add classnames to an outer <svg> element
        // "addAttributesToSVGElement",   // adds attributes to an outer <svg> element
        // "removeOffCanvasPaths",        // removes elements that are drawn outside of the viewbox
        // "removeStyleElement",          // remove <style> elements
        // "removeScriptElement",         // remove <script> elements
        // "reusePaths",                  // Find duplicated elements and replace them with links
    ]
  }