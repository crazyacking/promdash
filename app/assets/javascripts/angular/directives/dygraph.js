angular.module("Prometheus.directives").directive('dygraph', ["$location", "WidgetHeightCalculator", "VariableInterpolator", "RickshawDataTransformer", "YAxisUtilities", function($location, WidgetHeightCalculator, VariableInterpolator, RickshawDataTransformer, YAxisUtilities) {
  return {
    scope: {
      graphSettings: '=',
      aspectRatio: '=',
      vars: '='
    },
    link: function(scope, element, attrs) {
      var dygraph = null;
      var $el = $(element[0]);
      var graphData = [];

      function redrawGraph() {
        // Graph height is being set irrespective of legend.
        if (dygraph) {
          $el.html('<div class="graph_chart"><div class="legend"></div></div>');
          dygraph = null;
        }

        var graphHeight = WidgetHeightCalculator(element[0], scope.aspectRatio);
        var graphEl = $el.find('.graph_chart').get(0);
        $el.css('height', graphHeight);
        $(graphEl).css('height', graphHeight);

        if (!graphData.length) return

        // var series = RickshawDataTransformer(scope.graphData, axisIdByExprId);
        var data, labels = ["date"];
        graphData.forEach(function(d) {
          // Set up the timestamps.
          data = d.data.Value[0].Values.map(function(ts) {
            return [ts.Timestamp];
          });
          d.data.Value.forEach(function(m, i) {
            labels.push(m.Metric.instance);
            m.Values.forEach(function(datum, i) {
              data[i].push(parseFloat(datum.Value))
            });
          });
        });

        var isStacked = false;
        dygraph = new Dygraph(
          graphEl,
          data,
          { // parse xValues as UNIX timestamps.
            stackedGraph: isStacked,

            highlightCircleSize: 2,
            strokeWidth: 1,
            strokeBorderWidth: isStacked ? null : 1,

            highlightSeriesOpts: {
              strokeWidth: 3,
              strokeBorderWidth: 1,
              highlightCircleSize: 5,
            },
            axes: {
              x: {
                axisLabelFormatter: function(x) {
                  return (new Date(x*1000)).toLocaleDateString();
                }
              }
            },
            labels: labels.slice()
          }
        );
        var onclick = function(ev) {
          if (dygraph.isSeriesLocked()) {
            dygraph.clearSelection();
          } else {
            dygraph.setSelection(dygraph.getSelection(), dygraph.getHighlightSeries(), true);
          }
        };
        dygraph.updateOptions({clickCallback: onclick}, true);
        dygraph.setSelection(false, 's005');
      }

      function joinProperties(properties, separator) {
          var tooltipText = [];
          for (var k in properties) {
            if (k === "__name__") {
              continue;
            }
            tooltipText.push(k + separator + properties[k]);
          }
          return tooltipText;
      }

      function elementHeight($element) {
        return $element.outerHeight(true);
      }

      function calculateBound(series) {
        var yValues = series.map(function(s) {
          return s.data.map(function(d) {
            return d.y;
          });
        });
        var flatYValues = d3.merge(yValues);
        return function(bound) {
          var limit = bound.apply(Math, flatYValues);
          return limit;
        }
      }

      function calculateGraphHeight($legend) {
        var graphHeight = WidgetHeightCalculator(element[0], scope.aspectRatio);
        var height = graphHeight - elementHeight($legend);
        if (height < 1) height = 1;
        return height;
      }

      scope.$watch(function(scope) {
        return scope.graphSettings.expressions.map(function(expr) {
          return "" + expr.legend_id + expr.axis_id;
        });
      }, redrawGraph, true);
      scope.$watch('graphSettings.legendFormatStrings', redrawGraph, true);

      scope.$watch('graphSettings.stacked', redrawGraph);
      scope.$watch('graphSettings.palette', redrawGraph);
      scope.$watch('graphSettings.interpolationMethod', redrawGraph);
      scope.$watch('graphSettings.legendSetting', redrawGraph);
      scope.$watch('graphSettings.axes', redrawGraph, true);
      scope.$on('redrawGraphs', function(e, data) {
        if (data !== undefined) {
          graphData = data;
        }
        redrawGraph();
      });
    },
  };
}]);