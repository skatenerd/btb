// Generated by CoffeeScript 1.3.3
(function() {

  if (window.btb == null) {
    window.btb = {};
  }

  btb.stats = {
    treeMap: function(id, data) {
      var fixData, id_counter, tm;
      tm = new $jit.TM.Squarified({
        injectInto: id,
        titleHeight: 15,
        animate: true,
        offset: 0,
        Events: {
          enable: true,
          onClick: function(node) {
            if (node) {
              return tm.enter(node);
            }
          },
          onRightClick: function() {
            return tm.out();
          }
        },
        duration: 1000,
        Tips: {
          enable: true,
          offsetX: 20,
          offsetY: 20,
          onShow: function(tip, node, isLeaf, el) {
            return $(tip).html("" + node.name + " (" + node.data["$area"] + ")");
          }
        },
        onCreateLabel: function(el, node) {
          return $(el).html("" + node.name + " (" + node.data["$area"] + ")").css({
            color: "white",
            border: "none"
          });
        }
      });
      id_counter = 0;
      fixData = function(node, color) {
        var i, _i, _ref, _results;
        node.data = {
          '$area': node.size,
          '$color': "rgb(" + color[0] + ", " + color[1] + ", " + color[2] + ")"
        };
        node.id = "id" + id_counter;
        id_counter += 1;
        if (node.children != null) {
          _results = [];
          for (i = _i = 0, _ref = node.children.length; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
            color[i % color.length] += 50;
            _results.push(fixData(node.children[i], color));
          }
          return _results;
        } else {
          return node.children = [];
        }
      };
      fixData(data, [0, 0, 0]);
      tm.loadJSON(data);
      return tm.refresh();
    },
    stackedData: function(id, aggregates) {
      var ac, agg, color, data, entries, entry, items, labelNum, legend, name, ul, value, week, weeks, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
      data = {
        label: [],
        values: []
      };
      weeks = {};
      for (name in aggregates) {
        agg = aggregates[name];
        data.label.push(name);
        for (_i = 0, _len = agg.length; _i < _len; _i++) {
          entry = agg[_i];
          if (weeks[entry.week] == null) {
            weeks[entry.week] = {};
          }
          if (weeks[entry.week][name] == null) {
            weeks[entry.week][name] = entry.count;
          }
        }
      }
      items = (function() {
        var _results;
        _results = [];
        for (week in weeks) {
          entries = weeks[week];
          _results.push([week, entries]);
        }
        return _results;
      })();
      items.sort();
      for (_j = 0, _len1 = items.length; _j < _len1; _j++) {
        _ref = items[_j], week = _ref[0], entries = _ref[1];
        value = {
          label: week.split("T")[0].replace(/-/g, "."),
          values: []
        };
        _ref1 = data.label;
        for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
          name = _ref1[_k];
          if (entries[name] != null) {
            value.values.push(entries[name]);
          } else {
            value.values.push(0);
          }
        }
        data.values.push(value);
      }
      ac = new $jit.AreaChart({
        injectInto: id,
        animate: true,
        Margin: {
          top: 5,
          left: 5,
          right: 5,
          bottom: 5
        },
        labelOffset: 10,
        showAggregates: true,
        showLabels: true,
        type: 'stacked',
        Label: {
          overridable: true,
          type: 'HTML',
          size: 10,
          family: 'Arial',
          color: 'black'
        },
        Tips: {
          enable: true,
          onShow: function(tip, elem) {
            return $(tip).html("<b>" + elem.name + "</b>: " + elem.value);
          }
        },
        filterOnClick: true,
        restoreOnRightClick: true
      });
      ac.loadJSON(data);
      legend = ac.getLegend();
      ul = $("<ul class='legend' />");
      for (name in legend) {
        color = legend[name];
        ul.append("<li><div class='swatch' style='background-color: " + color + "'></div>" + name + "</li>");
      }
      $("#" + id).append(ul);
      labelNum = 0;
      $("#" + id + " .node").each(function() {
        if (labelNum % 4 !== 0) {
          $(this).remove();
        } else {
          $(this).css("width", $(this).width() * 4 + "px");
        }
        return labelNum += 1;
      });
      return ac;
    },
    impactChart: function(id, flat_data, user_field, l1units, l2units) {
      var colors, data, entry, i, index, make_color, part, partition, partitions, prev, running_total, sb, total, _i, _j, _k, _l, _len, _len1, _len2;
      colors = [[100, 0, 0], [0, 100, 0], [0, 0, 100], [0, 100, 100]];
      make_color = function(i, adder) {
        return "rgb(" + (colors[i][0] + adder) + ", " + (colors[i][1] + adder) + ", " + (colors[i][2] + adder) + ")";
      };
      total = 0;
      for (_i = 0, _len = flat_data.length; _i < _len; _i++) {
        entry = flat_data[_i];
        total += entry.count;
      }
      flat_data.sort(function(a, b) {
        return a.count - b.count;
      });
      partitions = [];
      for (i = _j = 0; _j < 4; i = ++_j) {
        partitions.push({
          id: "partition" + i,
          data: {
            "$color": make_color(i, 0),
            "$angularWidth": 0,
            count: 0,
            units: l1units
          },
          children: []
        });
      }
      index = 0;
      running_total = 0;
      prev = -1;
      for (_k = 0, _len1 = flat_data.length; _k < _len1; _k++) {
        entry = flat_data[_k];
        running_total += entry.count;
        if ((running_total > (total / 4) * (index + 1)) && (entry.count !== prev)) {
          index = Math.min(partitions.length - 1, index + 1);
        }
        prev = entry.count;
        partition = partitions[index];
        partition.data["$angularWidth"] += entry.count;
        partition.data.count += 1;
        partition.children.push({
          id: "entry" + running_total,
          name: entry[user_field],
          data: {
            "$color": make_color(index, parseInt(entry.count / total * 100)),
            "$angularWidth": entry.count,
            count: entry.count,
            units: l2units
          },
          children: []
        });
      }
      for (_l = 0, _len2 = partitions.length; _l < _len2; _l++) {
        part = partitions[_l];
        part.name = ("" + part.children[0].data["$angularWidth"] + " to ") + ("" + part.children[part.children.length - 1].data["$angularWidth"] + " ") + ("" + l2units);
      }
      running_total = 0;
      data = {
        id: "root",
        name: 'Impact',
        data: {
          '$type': 'none'
        },
        children: partitions
      };
      sb = new $jit.Sunburst({
        injectInto: id,
        levelDistance: 110,
        Node: {
          overridable: true,
          type: 'multipie'
        },
        Label: {
          type: 'Native'
        },
        NodeStyles: {
          enable: true,
          type: 'Native'
        },
        Tips: {
          enable: true,
          onShow: function(tip, node) {
            return tip.innerHTML = "<div class='tip'>" + node.name + " (" + node.data.count + " " + node.data.units + ")</div>";
          }
        },
        Events: {
          enable: true,
          onclick: function(node) {}
        },
        onCreateLabel: function(el, node) {
          return el.innerHTML = node.name;
        }
      });
      sb.loadJSON(data);
      return sb.refresh();
    }
  };

}).call(this);
