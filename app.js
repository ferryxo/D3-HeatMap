var $ = require("jquery")
var d3 = require("d3")
var HashMap = require("hashmap")
var tinycolor = require("tinycolor2");
var convert = require('color-convert');
var kolor = require('kolor')
var margin = {
        top: $("#chart").parent().height() / 6.5, //top: 0,
        right: 0
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
    , legendWidthPercentage = 0.8;

function get_custom_colors(color_scheme) {
    colors = []
    for (var i = 1; i < (color_scheme.total_intervals - 1); i++) {
        min_kolor = kolor(color_scheme.minimum_color)
        max_kolor = kolor(color_scheme.maximum_color)
        console.log(1 - (i / (color_scheme.total_intervals - 1)))
        colors.push(min_kolor.mix(max_kolor, i / (color_scheme.total_intervals - 1)).hex())
    }
    colors.reverse();
    colors.unshift(color_scheme.minimum_color)
    colors.push(color_scheme.maximum_color)
    console.log("and the colors are: " + colors)
    return colors;
}

function get_color_ranges_from_custom_scheme(color_scheme) {
    custom_colors = get_custom_colors(color_scheme)
    ranges = []
    diff = (color_scheme.maximum_value - color_scheme.minimum_value) / (color_scheme.total_intervals);
    console.log("diff: " + diff)
    for (var i = 2; i < color_scheme.total_intervals; i++) {
        console.log("min", parseFloat((color_scheme.minimum_value + (diff * (i - 1))).toFixed(2)))
        console.log("max", parseFloat((color_scheme.minimum_value + (diff * i)).toFixed(2)))
        ranges.push({
            color: custom_colors[i - 1]
            , minimum: parseFloat((color_scheme.minimum_value + (diff * (i - 1))).toFixed(2))
            , maximum: parseFloat((color_scheme.minimum_value + (diff * i)).toFixed(2))
        });
    }
    console.log(color_scheme.minimum_value)
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
$.getJSON("data.json", function (data) {
    h_labels = data.h_labels;
    v_labels = data.v_labels;
    console.log(height);
    console.log(width);
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
    console.log("Unique Values: ", uniqueValues)
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

function loadChart(data) {
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
        x_ticks.push(gridWidth * i);
    }
    var xAxis = d3.svg.axis(x).tickValues(x_ticks).tickFormat(function (d, i) {
        return h_labels[i];
    });
    svg.append("g").attr("class", "x axis").call(xAxis).selectAll("text").attr("class", "class_h_labels").style("text-anchor", "start").attr("dx", "2.25em").attr("dy", "0.4em").attr("transform", "rotate(-22.5)");
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
        cards.enter().append("rect").attr("x", function (d) {
            return (d.x) * gridWidth;
        }).attr("y", function (d) {
            return (d.y) * gridHeight;
        }).attr("rx", 4).attr("ry", 4).attr("class", "hour bordered").attr("width", gridWidth).attr("height", gridHeight).on("mouseover", function (d) {
            div.transition().duration(200).style("opacity", .65);
            div.html(d.text + "<br/>").style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 28) + "px");
        }).on("mouseout", function (d) {
            div.transition().duration(500).style("opacity", 0);
        });
        cards.transition().duration(1000).style("fill", function (d) {
            return get_fill_color(d.value);
        });
        cards.select("title").text(function (d) {
            return d.value;
        });
        cards.exit().remove();
        if (showTextInsideBoxes) {
            cards.enter().append("text").attr("x", function (d) {
                return ((d.x) * gridWidth);
            }).attr("y", function (d) {
                return (d.y) * gridHeight;
            }).attr("dx", gridWidth * 0.3).attr("dy", gridHeight / 2).attr("class", "mono").text(function (d) {
                return d.text;
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
                    //return getColorWithIntensity(range_hashmap[uniqueValues[i]].color, value, minimum, uniqueValues[i]);
                    return range_hashmap[uniqueValues[i]].color;
                }
            }
            return range_hashmap[uniqueValues[uniqueValues.length - 1]].color;
        }

        function wrap(text, width) {
            text.each(function () {
                var text = d3.select(this)
                    , words = text.text().split(/\s+/).reverse()
                    , word, line = []
                    , lineNumber = 0
                    , lineHeight = 1.1, // ems
                    y = text.attr("y")
                    , dy = parseFloat(text.attr("dy"))
                    , tspan = text.text(null).append("tspan").attr("x", text.attr("x")).attr("y", y).attr("dy", dy + "em");
                while (word = words.pop()) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", text.attr("x")).attr("y", text.attr("y")).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
            });
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
            var final_color = getAdjustedColor(color, intensity_percentage);
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
        console.log(legend_values);
        var legend = svg.selectAll(".legend").data(legend_values);
        legend.enter().append("g").attr("class", "legend");
        legend.append("rect").attr("x", function (d, i) {
            return legendElementWidth * i + (1 - legendWidthPercentage) * total_legendWidth / 2;
        }).attr("y", gridHeight * (v_labels.length + 0.5)).attr("width", legendElementWidth).attr("height", gridHeight / 2).style("fill", function (d, i) {
            return getRangeColor(d);
        });
        legend.append("text").attr("class", "mono").text(function (d) {
            if (d % 1 === 0) return "≥" + d
            else return "≥" + d.toFixed(2);
        }).attr("x", function (d, i) {
            return legendElementWidth * i + (1 - legendWidthPercentage) * total_legendWidth / 2;
        }).attr("y", gridHeight * (v_labels.length + 1) + gridHeight / 2.5);
        legend.exit().remove();
        changeTextSize();

        function changeTextSize() {
            var cols = document.getElementsByClassName('mono');
            for (i = 0; i < cols.length; i++) {
                cols[i].style.fontSize = $("#chart").parent().width() / 50 + "px";
            }
            var h_labels_elements = document.getElementsByClassName('class_h_labels')
            for (i = 0; i < h_labels_elements.length; i++) {
                h_labels_elements[i].style.fontSize = $("#chart").parent().width() / 60 + "px";
            }
        }
    };
    heatmapChart();
}