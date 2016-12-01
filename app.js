var $ = require("jquery")
var d3 = require("d3")
var HashMap = require("hashmap")
var tinycolor = require("tinycolor2");
var convert = require('color-convert');
var kolor = require('kolor')
var margin = {
        //top: $("#chart").parent().height() / 6.5, //top: 0,
        top: 100
        , right: 0
        , bottom: 0
        , left: $("#chart").parent().width() / 6
            //left: 0
    }
    , width = $("#chart").parent().width() - margin.left - margin.right
    , height = $("#chart").parent().height() - margin.top - margin.bottom
    , gridWidth = 0
    , gridHeight = 0
    , total_legendWidth = 0
    , h_labels = []
    , v_labels = []
    , color_ranges = []
    , range_hashmap = new HashMap()
    , uniqueValues = []
    , minimum_value = null
    , minimum_color = null
    , maximum_value = null
    , maximum_color = null
    , legendWidthPercentage = 0.8
    , jsonData = null
    , contractedColumnWidth = 0
    , expandedColumnWidth = 0
    , currentExpandedColumn = null
    , customColorSchemeEnabled = null
    , tooltiColorScheme = null
    , fontSize = 12;

function get_custom_colors(color_scheme) {
    colors = []
    for (var i = 1; i < (color_scheme.total_intervals - 1); i++) {
        min_kolor = kolor(color_scheme.minimum_color)
        max_kolor = kolor(color_scheme.maximum_color).lighten(0.1)
        colors.push(min_kolor.mix(max_kolor, i / (color_scheme.total_intervals - 1)).hex())
    }
    colors.reverse();
    colors.unshift(color_scheme.minimum_color)
    colors.push(color_scheme.maximum_color)
        //console.log("and the colors are: " + colors)
    return colors;
}

function get_color_ranges_from_custom_scheme(color_scheme) {
    custom_colors = get_custom_colors(color_scheme)
    ranges = []
    diff = (color_scheme.maximum_value - color_scheme.minimum_value) / (color_scheme.total_intervals);
    //console.log("diff: " + diff)
    for (var i = 2; i < color_scheme.total_intervals; i++) {
        //console.log("min", parseFloat((color_scheme.minimum_value + (diff * (i - 1))).toFixed(2)))
        //console.log("max", parseFloat((color_scheme.minimum_value + (diff * i)).toFixed(2)))
        ranges.push({
            color: custom_colors[i - 1]
            , minimum: parseFloat((color_scheme.minimum_value + (diff * (i - 1))).toFixed(2))
            , maximum: parseFloat((color_scheme.minimum_value + (diff * i)).toFixed(2))
        });
    }
    //console.log(color_scheme.minimum_value)
    ranges.unshift({
        color: custom_colors[0]
        , minimum: color_scheme.minimum_value
        , maximum: parseFloat((color_scheme.minimum_value + diff).toFixed(2))
    })
    ranges.push({
        color: custom_colors[custom_colors.length - 1]
        , minimum: parseFloat((color_scheme.maximum_value - diff).toFixed(2))
        , maximum: color_scheme.maximum_value
    })
    console.log(ranges)
    return ranges;
}
$.getJSON("cpr_data.json", function (data) {
    jsonData = data;
    fontSize = data['font-size']
    h_labels = data.h_labels;
    v_labels = data.v_labels;
    customColorSchemeEnabled = data.showCustomColorScheme;
    //console.log(height);
    //console.log(width);
    gridWidth = Math.floor((width - margin.left) / h_labels.length);
    gridHeight = Math.floor((height - margin.top) / v_labels.length);
    showTextInsideBoxes = data.showTextInsideBoxes;
    total_legendWidth = gridWidth * h_labels.length * 0.8;
    if (!data.showCustomColorScheme) {
        color_ranges = data.color_scheme.ranges;
    }
    else {
        color_ranges = get_color_ranges_from_custom_scheme(data.custom_color_scheme);
    }
    uniqueValues = get_range_values(color_ranges);
    //console.log("Unique Values: ", uniqueValues)
    minimum_value = uniqueValues[0]
    minimum_color = getRangeWhereMinimumIs(minimum_value, color_ranges);
    maximum_value = uniqueValues[uniqueValues.length - 1];
    maximum_color = getRangeWhereMaximumIs(maximum_value, color_ranges);
    uniqueValues.splice(0, 1);
    var iterator = null;
    for (var i = 0; i < uniqueValues.length; i++) {
        for (var j = 0; j < color_ranges.length; j++) {
            if (uniqueValues[i] === color_ranges[j].maximum) {
                range_hashmap[uniqueValues[i]] = color_ranges[j];
                break;
            }
        }
    }
    loadChart(data);
});

function getRangeWhereMinimumIs(value, color_ranges) {
    for (var i = 0; i < color_ranges.length; i++) {
        if (color_ranges[i].minimum === value) {
            return color_ranges[i].color;
        }
    }
    alert("Data related to ranges is not passed correctly.");
    return null;
}

function getRangeWhereMaximumIs(value, color_ranges) {
    var range = null;
    for (var i = 0; i < color_ranges.length; i++) {
        if (color_ranges[i].maximum === value) {
            return color_ranges[i].color;
        }
    }
    alert("Data related to ranges is not passed correctly.");
    return null;
}

function get_range_values(ranges) {
    values = []
    for (var i = 0; i < ranges.length; i++) {
        values.push(ranges[i].minimum)
        values.push(ranges[i].maximum)
    }
    var uniqueValues = [];
    $.each(values, function (i, el) {
        if ($.inArray(el, uniqueValues) === -1) uniqueValues.push(el);
    });
    return uniqueValues;
}

function reloadExpandedChart(number) {
    loadChart(jsonData, number)
}

function loadChart(data, expandedColumn = h_labels.length + 1) {
    $(".protip-container").remove();
    tooltiColorScheme = data.tooltipColorScheme;
    expandedColumnWidth = gridWidth * h_labels.length * 0.4;
    contractedColumnWidth = gridWidth * h_labels.length * 0.6 / (h_labels.length - 1);
    d3.select("svg").remove();
    var svg = d3.select("#chart").append("svg").attr("width", width + margin.left).attr("height", height + margin.top).append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    // Define the div for the tooltip
    var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    var courseLabels = svg.selectAll(".courseLabel").data(v_labels).enter().append("text").text(function (d) {
        return d;
    }).attr("x", 0).attr("y", function (d, i) {
        return i * gridHeight;
    }).style("text-anchor", "end").style("margin-right", "5px").attr("transform", "translate(-8," + gridHeight / 1.5 + ")").attr("class", function (d, i) {
        return ((i >= 0 && i <= h_labels.length) ? "courseLabel mono axis axis-workweek" : "courseLabel mono axis");
    });
    var x = d3.scale.linear().domain([
        0, gridWidth * h_labels.length
    ]).range([
        0, gridHeight * h_labels.length
    ]);
    var x_ticks = []
    for (var i = 0; i < h_labels.length; i++) {
        if (currentExpandedColumn == null) {
            console.log("currentExpanded is null");
            x_ticks.push(i * gridWidth);
        }
        else {
            x_ticks.push(getBaseXValue(i));
        }
    }
    var xAxis = d3.svg.axis(x).tickValues(x_ticks).tickFormat(function (d, i) {
        return h_labels[i];
    });
    svg.append("g").attr("class", "x axis").call(xAxis).selectAll("text").attr("class", "class_h_labels").style("text-anchor", "start").attr("dx", "2.25em").attr("dy", "-0.4em").attr("transform", "rotate(-22.5)");

    function getBaseColumnWidth(i) {}

    function getBaseXValue(x) {
        if ((x + 1) === currentExpandedColumn) {
            return x * contractedColumnWidth;
        }
        else if ((x + 1) < currentExpandedColumn) {
            return x * contractedColumnWidth;
        }
        else {
            return ((x - 1) * contractedColumnWidth) + expandedColumnWidth;
        }
    }
    var heatmapChart = function () {
        raw_data = data.content;
        data = [];
        for (var i = 0; i < raw_data.length; i++) {
            for (var j = 0; j < raw_data[i].length; j++) {
                data.push({
                    "x": j
                    , "y": i
                    , "text": raw_data[i][j].text
                    , "value": raw_data[i][j].value
                });
            }
        }
        var cards = svg.selectAll(".assignment").data(data);
        cards.append("title");
        cards.enter().append("rect").on("click", function (d, i) {
            var columnNumber = (i + 1) % h_labels.length;
            if (columnNumber == 0) {
                columnNumber = h_labels.length;
            }
            if (columnNumber == currentExpandedColumn) {
                currentExpandedColumn = null;
                reloadExpandedChart(h_labels.length + 1);
            }
            else {
                currentExpandedColumn = columnNumber;
                reloadExpandedChart(columnNumber);
            }
        }).attr("x", function (d) {
            if (currentExpandedColumn == null) {
                console.log("currentExpanded is null");
                return (d.x) * gridWidth;
            }
            else {
                return getBaseXValue(d.x);
            }
        }).attr("y", function (d) {
            return (d.y) * gridHeight;
        }).attr("rx", 4).attr("ry", 4).attr("class", "hour bordered").attr("width", function (d, i) {
            if (expandedColumn <= h_labels.length) {
                var columnNumber = ((i + 1) % h_labels.length);
                if (columnNumber == 0) {
                    columnNumber = h_labels.length;
                }
                if (columnNumber == expandedColumn) {
                    return expandedColumnWidth;
                }
                return contractedColumnWidth;
            }
            return gridWidth;
        }).attr("height", gridHeight);
        cards.transition().duration(1).style("fill", function (d) {
            return get_fill_color(d.value);
        });
        cards.select("title").text(function (d) {
            return d.value;
        });
        cards.exit().remove();
        if (showTextInsideBoxes) {
            cards.enter().append("foreignObject").attr("x", function (d) {
                if (currentExpandedColumn == null) {
                    console.log("currentExpanded is null");
                    return ((d.x) * gridWidth) + contractedColumnWidth * 0.1;
                }
                else {
                    return (getBaseXValue(d.x)) + contractedColumnWidth * 0.1;
                }
            }).attr("y", function (d) {
                return ((d.y) * gridHeight) + gridHeight * 0.1;
            }).attr("dx", gridWidth * 0.3).attr("dy", gridHeight / 2).attr("width", function (d, i) {
                if (expandedColumn <= h_labels.length) {
                    var columnNumber = ((i + 1) % h_labels.length);
                    if (columnNumber == 0) {
                        columnNumber = h_labels.length;
                    }
                    if (columnNumber == expandedColumn) {
                        return expandedColumnWidth;
                    }
                    return contractedColumnWidth;
                }
                return gridWidth;
            }).attr("height", gridHeight * 0.8).attr("class", "monoInside").on("click", function (d, i) {
                var columnNumber = (i + 1) % h_labels.length;
                if (columnNumber == 0) {
                    columnNumber = h_labels.length;
                }
                if (columnNumber == currentExpandedColumn) {
                    currentExpandedColumn = null;
                    reloadExpandedChart(h_labels.length + 1);
                }
                else {
                    currentExpandedColumn = columnNumber;
                    reloadExpandedChart(columnNumber);
                }
            }).append("xhtml:div").style("width", function (d, i) {
                if (expandedColumn <= h_labels.length) {
                    var columnNumber = ((i + 1) % h_labels.length);
                    if (columnNumber == 0) {
                        columnNumber = h_labels.length;
                    }
                    if (columnNumber == expandedColumn) {
                        return expandedColumnWidth * 0.9 + 'px';
                    }
                    return contractedColumnWidth * 0.9 + 'px';
                }
                return gridWidth * 0.9 + 'px';
            }).style("height", gridHeight * 0.75 + 'px').attr('class', 'clipped protip').style("font-size", function (d, i) {

                // use the font in json if it's defined
                if(fontSize != undefined)
                    return fontSize;
                //if the size is not defined, scale the font according to the chart's dimension
                var height = d3.select(this).style('height');
                height = height.substring(0, height.length - 2);
                var width = d3.select(this).style('width');
                width = height.substring(0, width.length - 2);
                size = $("#chart").parent().width() / 60;
                if (size < 15) {
                    size = 15;
                }
                return size + 'px';
            }).attr('data-pt-title', function (d, i) {
                return d.text.toString();
            }).attr('data-pt-animate', "fadeIn").attr('data-pt-scheme', tooltiColorScheme).append("xhtml:span").text(function (d, i) {
                return d.text.toString();
            });
            cards.exit().remove();
        }

        function get_fill_color(value) {
            if (value === minimum_value) {
                return minimum_color;
            }
            else if (value === maximum_value) {
                return maximum_color;
            }
            for (var i = 0; i < uniqueValues.length; i++) {
                if (value < uniqueValues[i]) {
                    if (i == 0) {
                        minimum = minimum_value;
                    }
                    else {
                        minimum = uniqueValues[i - 1];
                    }
                    if (!customColorSchemeEnabled) {
                        return getColorWithIntensity(range_hashmap[uniqueValues[i]].color, value, minimum, uniqueValues[i]);
                    }
                    else {
                        return range_hashmap[uniqueValues[i]].color;
                    }
                }
            }
            return range_hashmap[uniqueValues[uniqueValues.length - 1]].color;
        }

        function getRangeColor(value) {
            if (value === minimum_value) {
                return minimum_color;
            }
            else if (value === maximum_value) {
                return maximum_color;
            }
            for (var i = 0; i < uniqueValues.length; i++) {
                if (value < uniqueValues[i]) {
                    return range_hashmap[uniqueValues[i]].color;
                }
            }
        }

        function getColorWithIntensity(color, value, minimum_in_range, maximum_in_range) {
            var intensity_percentage = get_brightening_intensity_percentage(value, minimum_in_range, maximum_in_range);
            intensity_percentage = intensity_percentage / 100;
            //console.log("intensity_percentage", intensity_percentage);
            var final_color = kolor(color).lighten(intensity_percentage).hex();
            //console.log(final_color)
            return final_color;
        }

        function get_brightening_intensity_percentage(value, min, max) {
            if (value < 0) {
                var diff = value - min;
            }
            else {
                var diff = max - value;
            }
            return (diff * 100 / Math.abs(max - min)) / 5
        }

        function getAdjustedColor(color, intensity_percentage) {
            return tinycolor(color).lighten(intensity_percentage).toString();
        }
        var legend_values = uniqueValues.slice();
        var legendElementWidth = total_legendWidth / legend_values.length;
        legend_values.unshift(minimum_value);
        legend_values.pop();
        var legend = svg.selectAll(".legend").data(legend_values);
        legend.enter().append("g").attr("class", "legend");
        legend.append("rect").attr("x", function (d, i) {
            return legendElementWidth * i + (1 - legendWidthPercentage) * total_legendWidth / 2;
        }).attr("y", gridHeight * (v_labels.length + 0.5)).attr("width", legendElementWidth).attr("height", function (d, i) {
            if ((gridHeight / 2) > 35) {
                return 35;
            }
            else {
                return gridHeight / 2
            }
        }).style("fill", function (d, i) {
            return getRangeColor(d);
        });
        legend.append("text").attr("class", "mono").text(function (d) {
            if (d % 1 === 0) return "≥" + d
            else return "≥" + d.toFixed(2);
        }).attr("x", function (d, i) {
            return legendElementWidth * i + (1 - legendWidthPercentage) * total_legendWidth / 2;
        }).attr("y", gridHeight * (v_labels.length + 0.5) + 50);
        legend.exit().remove();
        changeTextSize();

        function changeTextSize() {
            var cols = document.getElementsByClassName('mono');
            size = $("#chart").parent().width() / 60;
            // use the font in json if it's defined
            if(fontSize != undefined)
                size = fontSize;
            else if (size < 15) {
                size = 15;
            }

            for (i = 0; i < cols.length; i++) {
                cols[i].style.fontSize = size + "px";
            }
            var h_labels_elements = document.getElementsByClassName('class_h_labels')
            for (i = 0; i < h_labels_elements.length; i++) {
                h_labels_elements[i].style.fontSize = size + "px";
            }
        }
    };
    heatmapChart();
}