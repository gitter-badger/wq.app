/*!
 * wq.app 0.5.1-dev - chart.js
 * Reusable SVG charts for analyzing time-series data.
 * (c) 2013, S. Andrew Sheppard
 * http://wq.io/license
 */

define(["d3"],
function(d3) {

var chart = {};

function _trans(x, y, off) {
    if (off) {
        x -= 0.5;
        y -= 0.5;
    }
    return 'translate(' + x + ',' + y + ')';
}

function _selectOrAppend(sel, name, cls) {
    var selector = name;
    if (cls)
        selector += "." + cls;
    var elem = sel.select(selector);
    if (elem.empty()) {
        elem = sel.append(name);
        if (cls)
            elem.attr('class', cls);
    }
    return elem;
}

// General chart configuration
chart.base = function() {
    var width=700, height=300, padding=7.5,
        margins = {'left': 80, 'right': 10, 'top': 10, 'bottom': 30},
        renderBackground = false,
        xscale = null,
        xscalefn = d3.scale.linear,
        xnice = null,
        yscales = {},
        yscalefn = d3.scale.linear;

    // Accessor for entire data object
    function datasets(d) {
        if (d.data)
            return d.data;
        return d;
    }

    // Accessors for individual datasets
    function id(dataset) {
        return dataset.id;
    }
    function label(dataset) {
        return dataset.label;
    }
    function items(dataset) {
        return dataset.list;
    }

    function xunits(dataset) {
        /* jshint unused: false */
        throw "xunits accessor not defined!";
    }
    function xmax(dataset) {
        return d3.max(items(dataset), xvalue);
    }
    function xmin(dataset) {
        return d3.min(items(dataset), xvalue);
    }

    function yunits(dataset) {
        return dataset.units;
    }
    function ymax(dataset) {
        return d3.max(items(dataset), yvalue);
    }
    function ymin(dataset) {
        return d3.min(items(dataset), yvalue);
    }

    // Accessors for individual items
    function xvalue(d) {
        /* jshint unused: false */
        throw "xvalue accessor not defined!";
    }
    function yvalue(d) {
        /* jshint unused: false */
        throw "yvalue accessor not defined!";
    }
    function xscaled(d) {
        return xscale.scale(xvalue(d));
    }
    function yscaled(scaleid) {
        var yscale = yscales[scaleid];
        return function(d) {
            return yscale.scale(yvalue(d));
        };
    }
    function itemid(d) {
        return xvalue(d) + "=" + yvalue(d);
    }

    // Rendering functions (should be overridden)
    function init(datasets) {
        /* jshint unused: false */
    }
    function render(dataset) {
        /* jshint unused: false */
    }
    function wrapup(datasets, opts) {
        /* jshint unused: false */
    }

    // Generate translation function xscale + given yscale
    function translate(scaleid) {
        var yfn = yscaled(scaleid);
        return function(d) {
            var x = xscaled(d);
            var y = yfn(d);
            return _trans(x, y);
        };
    }

    // Plot using given selection (usually one object, but wrapped as array)
    function plot(sel) {
        sel.each(_plot);
    }

    // The actual work
    function _plot(data) {
        init.call(this, datasets(data));

        var svg = d3.select(this);
        var cwidth = width - padding - padding;
        var cheight = height - padding - padding;
        var gwidth = cwidth - margins.left - margins.right;
        var gheight = cheight - margins.top - margins.bottom;
        var cbottom = cheight - margins.bottom;

        // Clip for inner graphing area
        var defs = _selectOrAppend(svg, 'defs');
        var clip = defs.select('#clip'); // Webkit can't select clipPath #83438
        if (clip.empty()) {
            clip = defs.append('clipPath').attr('id', 'clip');
            clip.append('rect');
        }
        clip.select('rect')
            .attr('width', gwidth)
            .attr('height', gheight);

        // Outer chart area (includes legends, axes & actual graph)
        var outer = _selectOrAppend(svg, 'g', 'outer');
        outer.attr('transform', _trans(padding, padding, true));
        _selectOrAppend(outer, 'rect')
            .attr('width', cwidth)
            .attr('height', cheight)
            .attr('fill', '#eee');

        // Inner graphing area (clipped)
        var inner = _selectOrAppend(outer, 'g', 'inner')
            .attr('clip-path', 'url(#clip)')
            .attr('transform', _trans(margins.left, margins.top));
        _selectOrAppend(inner, 'rect')
            .attr('width', gwidth)
            .attr('height', gheight)
            .attr('fill', '#ccc');

        // Compute horizontal & vertical scales
        // - may be more than one vertical scale if there are different units
        var left = true;
        var xvals = d3.set();
        datasets(data).forEach(function(dataset) {
            if (!xscale) {
                xscale = {
                    'xmin': Infinity,
                    'xmax': -Infinity,
                    'auto': true
                };
            }
            if (xscale.auto) {
                xscale.xmax = d3.max([xscale.xmax, xmax(dataset)]);
                xscale.xmin = d3.min([xscale.xmin, xmin(dataset)]);
            }
            if (xscalefn().rangePoints)
                items(dataset).forEach(function(d){xvals.add(xvalue(d));});

            var scaleid = yunits(dataset);
            if (!yscales[scaleid]) {
                yscales[scaleid] = {
                    'ymin': 0,
                    'ymax': 0,
                    'auto': true
                };
            }
            var yscale = yscales[scaleid];
            if (!yscale.id)
                yscale.id = scaleid;
            if (!yscale.orient)
                yscale.orient = left ? 'left' : 'right';
            left = !left;
            if (!yscale.sets)
                yscale.sets = 0;
            yscale.sets++;
            if (yscale.auto) {
                yscale.ymax = d3.max([yscale.ymax, ymax(dataset)]);
                yscale.ymin = d3.min([yscale.ymin, ymin(dataset)]);
            }
        });

        xscale.scale = xscalefn();
        // Create actual scale & axis objects
        if (xscale.scale.rangePoints)
            xscale.scale
                .domain(xvals.values())
                .rangePoints([0, gwidth], 1);
        else
            xscale.scale
                .domain([xscale.xmin, xscale.xmax])
                .range([0, gwidth]);
        if (xscale.scale.nice && xnice)
            xscale.scale.nice(xnice);

        xscale.axis = d3.svg.axis()
            .scale(xscale.scale)
            .orient('bottom')
            .tickSize(4, 2, 1);

        for (var scaleid in yscales) {
            var scale = yscales[scaleid];
            var domain;
            if (scale.invert)
                domain = [scale.ymax, scale.ymin];
            else
                domain = [scale.ymin, scale.ymax];
            scale.scale = yscalefn()
                .domain(domain)
                .nice()
                .range([gheight, 0]);

            scale.axis = d3.svg.axis()
                .scale(scale.scale)
                .orient(scale.orient)
                .tickSize(4, 2, 1);
        }

        // Additional processing
        var opts = {
            'padding': padding,
            'gwidth': gwidth,
            'gheight': gheight,
            'cwidth': cwidth,
            'cheight': cheight
        };

        // Render each dataset
        if (renderBackground) {
            var background = inner.selectAll('g.dataset-background')
               .data(datasets(data), id);
            background.enter()
                .append('g')
                .attr('class', 'dataset-background');
            background.exit().remove();
            background.each(renderBackground);
        }
        var series = inner.selectAll('g.dataset')
            .data(datasets(data), id);
        series.enter()
            .append('g')
            .attr('class', 'dataset');
        series.exit().remove();
        series.each(render);

        // Render axes
        _selectOrAppend(outer, 'g', 'xaxis')
            .attr('transform', _trans(margins.left, cbottom))
            .call(xscale.axis)
            .selectAll('line').attr('stroke', '#000');

        var yaxes = outer.selectAll('g.axis')
            .data(d3.keys(yscales), function(s){ return s; });
        yaxes.enter().append('g').attr('class', 'axis');
        yaxes.exit().remove();
        yaxes.attr('transform', function(d) {
                var x;
                if (yscales[d].orient == 'left')
                    x = margins.left;
                else
                    x = cwidth - margins.right;
                var y = margins.top;
                return _trans(x, y);
            })
            .each(function(d) {
                d3.select(this)
                   .call(yscales[d].axis)
                   .selectAll('line').attr('stroke', '#000');
            });

        wrapup.call(this, datasets(data), opts);
    }

    // Getters/setters for chart configuration
    plot.width = function(val) {
        if (!arguments.length) return width;
        width = val;
        return plot;
    };
    plot.height = function(val) {
        if (!arguments.length) return height;
        height = val;
        return plot;
    };
    plot.margins = function(val) {
        if (!arguments.length) return margins;
        margins = val;
        return plot;
    };
    plot.xscale = function(val) {
        if (!arguments.length) return xscale;
        xscale = val;
        return plot;
    };
    plot.xscalefn = function(fn) {
        if (!arguments.length) return xscalefn;
        xscalefn = fn;
        return plot;
    };
    plot.xscaled = function(fn) {
        if (!arguments.length) return xscaled;
        xscaled = fn;
        return plot;
    };
    plot.xnice = function(val) {
        if (!arguments.length) return xnice;
        xnice = val;
        return plot;
    };
    plot.yscales = function(val) {
        if (!arguments.length) return yscales;
        yscales = val;
        return plot;
    };
    plot.yscalefn = function(fn) {
        if (!arguments.length) return yscalefn;
        yscalefn = fn;
        return plot;
    };
    plot.yscaled = function(fn) {
        if (!arguments.length) return yscaled;
        yscaled = fn;
        return plot;
    };

    // Getters/setters for accessors
    plot.id = function(fn) {
        if (!arguments.length) return id;
        id = fn;
        return plot;
    };
    plot.label = function(fn) {
        if (!arguments.length) return label;
        label = fn;
        return plot;
    };
    plot.items = function(fn) {
        if (!arguments.length) return items;
        items = fn;
        return plot;
    };
    plot.yunits = function(fn) {
        if (!arguments.length) return yunits;
        yunits = fn;
        return plot;
    };
    plot.xunits = function(fn) {
        if (!arguments.length) return xunits;
        xunits = fn;
        return plot;
    };
    plot.xvalue = function(fn) {
        if (!arguments.length) return xvalue;
        xvalue = fn;
        return plot;
    };
    plot.xmin = function(fn) {
        if (!arguments.length) return xmin;
        xmin = fn;
        return plot;
    };
    plot.xmax = function(fn) {
        if (!arguments.length) return xmax;
        xmax = fn;
        return plot;
    };
    plot.yvalue = function(fn) {
        if (!arguments.length) return yvalue;
        yvalue = fn;
        return plot;
    };
    plot.ymin = function(fn) {
        if (!arguments.length) return ymin;
        ymin = fn;
        return plot;
    };
    plot.ymax = function(fn) {
        if (!arguments.length) return ymax;
        ymax = fn;
        return plot;
    };
    plot.itemid = function(fn) {
        if (!arguments.length) return itemid;
        itemid = fn;
        return plot;
    };

    // Getters/setters for render functions
    plot.init = function(fn) {
        if (!arguments.length) return init;
        init = fn;
        return plot;
    };
    plot.renderBackground = function(fn) {
        if (!arguments.length) return renderBackground;
        renderBackground = fn;
        return plot;
    };
    plot.render = function(fn) {
        if (!arguments.length) return render;
        render = fn;
        return plot;
    };
    plot.wrapup = function(fn) {
        if (!arguments.length) return wrapup;
        wrapup = fn;
        return plot;
    };
    plot.translate = function(fn) {
        if (!arguments.length) return translate;
        translate = fn;
        return plot;
    };
    return plot;
};

// Scatter plot
chart.scatter = function() {
    var plot = chart.base(),
        cscale = d3.scale.category20(),
        legend = null;

    plot.xvalue(function(d) {
        return d.x;
    }).xunits(function(dataset) {
        return dataset.xunits;
    }).yvalue(function(d) {
        return d.y;
    }).yunits(function(dataset) {
        return dataset.yunits;
    });

    plot.init(function(datasets) {
        if (legend && !legend.auto)
            return;

        var rows = datasets.length;
        if (rows > 5) {
            plot.legend({
                'position': 'right',
                'size': 200,
                'auto': true
            });
        } else {
            plot.legend({
                'position': 'bottom',
                'size': (rows * 22 + 20),
                'auto': true
            });
        }
    });

    /* To customize points beyond just the color, override these functions */
    function pointShape(sid) {
        /* jshint unused: false */
        return "circle";
    }
    function pointStyle(sid) {
        var color = cscale(sid);
        return function(sel) {
            sel.attr('r', 3)
                .attr('fill', color)
                .attr('stroke', 'black')
                .attr('cursor', 'pointer');
        };
    }

    /* To customize lines beyond just the color, override this function */
    function lineStyle(sid) {
        var color = cscale(sid);
        return function(sel) {
            sel.attr('stroke', color);
        };
    }

    function pointover(sid) {
        /* jshint unused: false */
        return function(d) {
            d3.select(this).selectAll(pointShape(sid))
                .attr('fill', '#9999ff');
        };
    }
    function pointout(sid) {
        /* jshint unused: false */
        return function(d) {
            d3.select(this).selectAll(pointShape(sid))
               .attr('fill', cscale(sid));
        };
    }
    function pointLabel(sid) {
        var x = plot.xvalue(),
            y = plot.yvalue();
        return function(d) {
            return sid + " at " + x(d) + ": " + y(d);
        };
    }
    function drawPointsIf(dataset) {
        var items = plot.items()(dataset);
        return items && items.length <= 50;
    }
    function drawLinesIf(dataset){
        var items = plot.items()(dataset);
        return items && items.length > 50;
    }

    // Render lines in background to ensure all points are above them
    plot.renderBackground(function(dataset) {
        if (!drawLinesIf(dataset))
            return;
        var items   = plot.items()(dataset),
            yunits  = plot.yunits()(dataset),
            sid     = plot.id()(dataset),
            xscaled = plot.xscaled(),
            yscaled = plot.yscaled()(yunits),
            g       = d3.select(this),
            path    = g.select('path.data'),
            line    = d3.svg.line()
                        .x(xscaled)
                        .y(yscaled);
        // Generate path element for new datasets
        if (path.empty()) {
            path = g.append('path')
                .attr('class', 'data')
                .attr('fill', 'transparent');
        }
        // Update path for new and existing datasets
        path.datum(items)
            .attr('d', line)
            .call(lineStyle(sid));
    });

    plot.render(function(dataset) {
        if (!drawPointsIf(dataset))
            return;
        var items     = plot.items()(dataset),
            yunits    = plot.yunits()(dataset),
            sid       = plot.id()(dataset),
            translate = plot.translate(),
            g         = d3.select(this),
            points, newpoints;

        points = g.selectAll('g.data').data(items, plot.itemid());

        // Generate elements for new data
        newpoints = points.enter().append('g')
            .attr('class', 'data')
            .on('mouseover', pointover(sid))
            .on('mouseout',  pointout(sid));
        newpoints.append(pointShape(sid));
        newpoints.append('title');

        points.exit().remove();

        // Update elements for new or existing data
        points.attr('transform', translate(yunits));
        points.select(pointShape(sid)).call(pointStyle(sid));
        points.select('title').text(pointLabel(sid));
    });

    plot.wrapup(function(datasets, opts) {
        var svg = d3.select(this),
            outer = svg.select('g.outer'),
            margins = plot.margins(),
            label = plot.label(),
            id = plot.id(),
            legendX, legendY, legendW, legendH;

        if (legend.position == 'bottom') {
            legendX = margins.left;
            legendY = opts.cheight - margins.bottom + 30;
            legendW = opts.gwidth;
            legendH = legend.size;
        } else {
            legendX = opts.cwidth - margins.right + 10;
            legendY = margins.top;
            legendW = legend.size;
            legendH = opts.gheight;
        }

        var leg = _selectOrAppend(outer, 'g', 'legend')
            .attr('transform', _trans(legendX, legendY));
        _selectOrAppend(leg, 'rect')
            .attr('width', legendW)
            .attr('height', legendH)
            .attr('fill', 'white')
            .attr('stroke', '#999');

        var legitems = leg.selectAll('g.legenditem')
            .data(datasets, id);
        var newitems = legitems.enter().append('g')
            .attr('class', 'legenditem')
            .append('g')
                .attr('class', 'data');
        newitems.each(function(d) {
            var g = d3.select(this),
                sid = id(d);
            g.append(pointShape(sid));
            g.append('text');
        });
        legitems.exit().remove();
        legitems.each(function(d, i) {
            var g = d3.select(this).select('g.data'),
                sid = id(d);
            g.attr('transform', _trans(20, 20 + i * 22));
            g.select(pointShape(sid)).call(pointStyle(sid));
            g.select('text')
                .text(label(d))
                .attr('transform', _trans(10, 5));
        });
    });

    // Getters/setters for chart configuration
    plot.cscale = function(fn) {
        if (!arguments.length) return cscale;
        cscale = fn;
        return plot;
    };

    plot.pointShape = function(fn) {
        if (!arguments.length) return pointShape;
        pointShape = fn;
        return plot;
    };

    plot.pointStyle = function(fn) {
        if (!arguments.length) return pointStyle;
        pointStyle = fn;
        return plot;
    };

    plot.lineStyle = function(fn) {
        if (!arguments.length) return lineStyle;
        lineStyle = fn;
        return plot;
    };

    plot.pointover = function(fn) {
        if (!arguments.length) return pointover;
        pointover = fn;
        return plot;
    };

    plot.pointout = function(fn) {
        if (!arguments.length) return pointout;
        pointout = fn;
        return plot;
    };

    plot.pointLabel = function(fn) {
        if (!arguments.length) return pointLabel;
        pointLabel = fn;
        return plot;
    };

    plot.drawPointsIf = function(fn) {
        if (!arguments.length) return drawPointsIf;
        drawPointsIf = fn;
        return plot;
    };

    plot.drawLinesIf = function(fn) {
        if (!arguments.length) return drawLinesIf;
        drawLinesIf = fn;
        return plot;
    };

    plot.legend = function(val) {
        if (!arguments.length) return legend;
        legend = val;
        var margins = plot.margins();
        if (legend.position == 'bottom') {
            margins.bottom = legend.size + 30;
            margins.right = 10;
        } else {
            margins.bottom = 30;
            margins.right = legend.size + 20;
        }
        plot.margins(margins);
        return plot;
    };

    return plot;
};

// Time series scatter plot
chart.timeSeries = function() {
    var plot = chart.scatter(),
        format = d3.time.format('%Y-%m-%d');

    plot.xvalue(function(d) {
        return format.parse(d.date);
    })
    .xscalefn(d3.time.scale)
    .xnice(d3.time.year)
    .yvalue(function(d) {
        return d.value;
    })
    .pointLabel(function(sid) {
        var x = plot.xvalue(),
            y = plot.yvalue();
        return function(d) {
            return sid + " on " + format(x(d)) + ": " + y(d);
        };
    });

    // Getters/setters for chart configuration
    plot.timeFormat = function(val) {
        if (!arguments.length) return format;
        format = d3.time.format(val);
        return plot;
    };

    return plot;
};

// Contours (precomputed)
chart.contour = function() {
    var plot = chart.scatter();
    plot.render(function(dataset) {
        var x = plot.xvalue(),
            y = plot.yvalue(),
            yunits = plot.yunits(),
            xscale = plot.xscale().scale,
            yscale = plot.yscales()[yunits(dataset)].scale,
            cscale = plot.cscale(),
            id = plot.id(),
            items = plot.items();

        var path = d3.svg.line()
            .x(function(d) {
                return xscale(x(d));
            })
            .y(function(d) {
                return yscale(y(d));
            });

        d3.select(this).selectAll('path.contour')
           .data(items(dataset))
           .enter()
               .append('path')
               .attr('class', 'contour')
               .attr('d', path)
               .attr('fill', cscale(id(dataset)));
    });
    return plot;
};

// Box & whiskers (precomputed)
chart.boxplot = function() {
    var plot = chart.base()
        .xscalefn(d3.scale.ordinal)
        .ymin(function(dataset) {
            var items = plot.items();
            return d3.min(items(dataset), function(d) {
                return d.min;
            });
        })
        .ymax(function(dataset) {
            var items = plot.items();
            return d3.max(items(dataset), function(d) {
                return d.max;
            });
        })
        .render(function(dataset) {
            var items     = plot.items()(dataset),
                yunits    = plot.yunits()(dataset),
                yscales   = plot.yscales(),
                xscale    = plot.xscale(),
                xvalue    = plot.xvalue();

            function translate(scaleid) {
                var yscale = yscales[scaleid];
                return function(d) {
                    var x = xscale.scale(xvalue(d));
                    var y = yscale.scale(0);
                    return _trans(x, y);
                };
            }

            d3.select(this).selectAll('g.data').data(items)
                .enter()
                .append('g')
                    .attr('class', 'data')
                    .attr('transform', translate(yunits))
                .each(box(yunits));
        });

    function box(sid) {
        var yscale = plot.yscales()[sid];
        return function(d) {
            if (!d || (!d.median && !d.min && !d.max))
                return;
            function y(val) {
                return yscale.scale(val) - yscale.scale(0);
            }
            var box = d3.select(this).append('g')
                .attr('class', 'box')
                .attr('transform', _trans(-10, 0));
            box.append('line')
               .attr('x1', 0)
               .attr('x2', 20)
               .attr('y1', y(d.p25))
               .attr('y2', y(d.p25))
               .attr('stroke', '#000');
            box.append('line')
               .attr('x1', 0)
               .attr('x2', 20)
               .attr('y1', y(d.p75))
               .attr('y2', y(d.p75))
               .attr('stroke', '#000');
            box.append('line')
               .attr('x1', 0)
               .attr('x2', 20)
               .attr('y1', y(d.median))
               .attr('y2', y(d.median))
               .attr('stroke', '#000');
            box.append('line')
               .attr('x1', 0)
               .attr('x2', 0)
               .attr('y1', y(d.p25))
               .attr('y2', y(d.p75))
               .attr('stroke', '#000');
            box.append('line')
               .attr('x1', 20)
               .attr('x2', 20)
               .attr('y1', y(d.p25))
               .attr('y2', y(d.p75))
               .attr('stroke', '#000');
            box.append('line')
               .attr('x1', 5)
               .attr('x2', 15)
               .attr('y1', y(d.max))
               .attr('y2', y(d.max))
               .attr('stroke', '#000');
            box.append('line')
               .attr('x1', 5)
               .attr('x2', 15)
               .attr('y1', y(d.min))
               .attr('y2', y(d.min))
               .attr('stroke', '#000');
            box.append('line')
               .attr('x1', 10)
               .attr('x2', 10)
               .attr('y1', y(d.max))
               .attr('y2', y(d.p75))
               .attr('stroke', '#000');
            box.append('line')
               .attr('x1', 10)
               .attr('x2', 10)
               .attr('y1', y(d.min))
               .attr('y2', y(d.p25))
               .attr('stroke', '#000');
        };
    }

    return plot;
};

return chart;

});