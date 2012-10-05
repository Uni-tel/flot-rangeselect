/*
 * Flot plugin for selecting a range in a graph by moving/resizing a selection area on a second graph
 * 
 * Version 1.1
 *
 * Released under the MIT license by Troels Bang Jensen, August 2012
 * 
 * Version history:
 * 
 * 1.0 Initial version
 * 
 * 1.1 Fixed some cursor issues on leaving the graph and selecting handles at the ends of the graph.
 * 
 * 1.2 Limit cursor style to canvas element to avoid hanging cursor style in the rest of the document.
 * 
 */

(function($){
    function init(plot){
        //Internal variables
        var rangeselection = {
          start:  null,
          end: null,
          active: false,
          moveStart: 0,
          movex: 0,
          handle: "",
          color: "#fbb"
        };
        var savedhandlers = {};
        var mouseUpHandler = null;
        var mouseFuzz = 5;
        function onMouseMove(e){
            var o = plot.getOptions();
            if(!o.rangeselection.enabled){
                plot.getPlaceholder().css('cursor', 'auto');
                return true;
            }
            var offset = plot.getPlaceholder().offset();
            var plotOffset = plot.getPlotOffset();
            var realX = e.pageX - offset.left - plotOffset.left;
            var realY = e.pageY - offset.top - plotOffset.top;
            if(realX < 0 || realY < 0){
                //console.info("x:"+realX+", y:"+realY);
                plot.getPlaceholder().css('cursor', 'auto');
                return false;
            }
            var x = clamp(0, realX, plot.width());
            
            if(!rangeselection.active){   
                var xaxis = plot.getAxes().xaxis;
                var f = xaxis.p2c(rangeselection.start);
                var s = xaxis.p2c(rangeselection.end);
                var tolerance = mouseFuzz;
                if(Math.abs(f - x) < tolerance && f >= 0){
                    plot.getPlaceholder().css('cursor', 'w-resize');
                }else if(Math.abs(s - x) < tolerance && s <= plot.width()){
                    plot.getPlaceholder().css('cursor', 'e-resize');
                }else if(x > f && x < s){
                    plot.getPlaceholder().css('cursor', 'move');
                }else{
                    plot.getPlaceholder().css('cursor', 'auto');
                }
                return false;
            }
            rangeselection.movex = x;
            plot.triggerRedrawOverlay();
            return false;
        }
        function onMouseDown(e){
            var o = plot.getOptions();
            if(!o.rangeselection.enabled)
                return;
            if(e.which != 1) // Only accept left-clicks
                return;
            
            //Cancel out any text selections
            document.body.focus();
            
             // prevent text selection and drag in old-school browsers
            if (document.onselectstart !== undefined && savedhandlers.onselectstart == null) {
                savedhandlers.onselectstart = document.onselectstart;
                document.onselectstart = function () { return false; };
            }
            if (document.ondrag !== undefined && savedhandlers.ondrag == null) {
                savedhandlers.ondrag = document.ondrag;
                document.ondrag = function () { return false; };
            }

            // this is a bit silly, but we have to use a closure to be
            // able to whack the same handler again
            mouseUpHandler = function (e) { onMouseUp(e); };
            
            
            var offset = plot.getPlaceholder().offset();
            var plotOffset = plot.getPlotOffset();
            var x = clamp(0, e.pageX - offset.left - plotOffset.left, plot.width());
            var xaxis = plot.getAxes().xaxis;
            var f = xaxis.p2c(rangeselection.start);
            var s = xaxis.p2c(rangeselection.end);
            var tolerance = mouseFuzz;
            if(Math.abs(f - x) <= tolerance){
                plot.getPlaceholder().css('cursor', 'w-resize');
                rangeselection.handle = "start";
                rangeselection.active = true;
            }else if(Math.abs(s - x) <= tolerance){
                plot.getPlaceholder().css('cursor', 'e-resize');
                rangeselection.handle = "end";
                rangeselection.active = true;
            }else{ // if(x > f && x < s)
                plot.getPlaceholder().css('cursor', 'move');
                rangeselection.handle = "move";
                rangeselection.moveStart = s - (s - f) / 2;
                rangeselection.active = true;
            }
            
            
            mouseUpHandler = function(e) { onMouseUp(e);};
            $(document).one("mouseup", mouseUpHandler);
        }
        function onMouseUp(e){
            var o = plot.getOptions();
            if(!o.rangeselection.enabled)
                return true;
            mouseUpHandler = null;
            plot.getPlaceholder().css('cursor', 'auto');
            rangeselection.active = false;
            var offset = plot.getPlaceholder().offset();
            var plotOffset = plot.getPlotOffset();
            var x = clamp(0, e.pageX - offset.left - plotOffset.left, plot.width());
            var xaxis = plot.getAxes().xaxis;
            var f = xaxis.p2c(rangeselection.start);
            var s = xaxis.p2c(rangeselection.end);
             switch(rangeselection.handle){
                    case "start":
                        f = x;
                        if(x < 0)
                            f = 0;
                        if(x > s - 10)
                            f = s - 10; //Minimum size of selection
                    break;
                    case "end":
                        s = x;
                        if(x > plot.width())
                            s = plot.width();
                        if(x < f + 10)
                            s = f + 10; //Minimum size of selection

                    break;
                    case "move":
                        var dx = x -  rangeselection.moveStart;
                        if(f + dx < 0){
                            s -= f;
                            f = 0;
                        }else if (s+dx > plot.width()){
                            f = plot.width() - (s - f);
                            s = plot.width();
                        }else{
                            s += dx;
                            f += dx;
                        }
                    break; 
                }
            rangeselection.start = xaxis.c2p(f);
            rangeselection.end = xaxis.c2p(s);
            var o = plot.getOptions();
            plot.triggerRedrawOverlay();
            if(o.rangeselection.callback && typeof(o.rangeselection.callback) === "function"){
                o.rangeselection.callback({start: rangeselection.start, end: rangeselection.end});
            }
            return false;
        }
        function clamp(min, value, max){
            return value < min ? min : ( value > max ? max : value);
        }
        function calculateLimits(plot){
             var xaxis = plot.getAxes().xaxis;
                
                var x = rangeselection.movex;
                var f = xaxis.p2c(rangeselection.start);
                var s = xaxis.p2c(rangeselection.end);
                switch(rangeselection.handle){
                    case "start":
                        f = x;
                        if(x < 0)
                            f = 0;
                        if(x > s - 10)
                            f = s - 10; //Minimum size of selection
                    break;
                    case "end":
                        s = x;
                        if(x > plot.width())
                            s = plot.width();
                        if(x < f + 10)
                            s = f + 10; //Minimum size of selection

                    break;
                    case "move":
                        var dx = x -  rangeselection.moveStart;
                        if(f + dx < 0){
                            s -= f;
                            f = 0;
                        }else if (s+dx > plot.width()){
                            f = plot.width() - (s - f);
                            s = plot.width();
                        }else{
                            s += dx;
                            f += dx;
                        }
                    break; 
                }
        }
        function roundedRect(ctx,x,y,w,h,radius,fill,stroke){
            ctx.save();	// save the context so we don't mess up others
            var r = x + w;
            var b = y + h;
            ctx.beginPath();
            ctx.lineWidth="4";
            ctx.moveTo(x+radius, y);
            ctx.lineTo(r-radius, y);
            ctx.quadraticCurveTo(r, y, r, y+radius);
            ctx.lineTo(r, y+h-radius);
            ctx.quadraticCurveTo(r, b, r-radius, b);
            ctx.lineTo(x+radius, b);
            ctx.quadraticCurveTo(x, b, x, b-radius);
            ctx.lineTo(x, y+radius);
            ctx.quadraticCurveTo(x, y, x+radius, y);
            ctx.stroke();


            if(fill){
                ctx.fill();
            }
            if(stroke){
                ctx.stroke();
            }
            ctx.restore();	// restore context to what it was on entry  
        }
        function drawSelection(plot, ctx, start, end){
            var o = plot.getOptions();
            var plotOffset = plot.getPlotOffset();
            ctx.save();
            ctx.translate(plotOffset.left, plotOffset.top);
            var c = $.color.parse(o.rangeselection.color);
            ctx.strokeStyle = c.scale('a', 0.9).toString();
            ctx.lineWidth = 3;
            ctx.lineJoin = "round";
            ctx.fillStyle = c.scale('a', 0.4).toString();
            var xaxis = plot.getAxes().xaxis;
            var f = xaxis.p2c(start);
            var s = xaxis.p2c(end);
            var x = f,
                y = 0,
                w = s-f,
                h = plot.height();
            roundedRect(ctx,x,y,w,h,3, true, true);
            ctx.restore();
        }
        plot.hooks.bindEvents.push(function(plot, eventHolder){
           var o = plot.getOptions();         
           eventHolder.mousemove(onMouseMove);
           eventHolder.mousedown(onMouseDown);
        });
        plot.hooks.draw.push(function(plot, ctx){
           plot.triggerRedrawOverlay(); 
        });
        plot.hooks.drawOverlay.push(function(plot, ctx){
            var o = plot.getOptions();
            if(!o.rangeselection.enabled)
                return;
            if(rangeselection.active){
                 var xaxis = plot.getAxes().xaxis;
                
                var x = rangeselection.movex;
                var f = xaxis.p2c(rangeselection.start);
                var s = xaxis.p2c(rangeselection.end);
                switch(rangeselection.handle){
                    case "start":
                        f = x;
                        if(x < 0)
                            f = 0;
                        if(x > s - 10)
                            f = s - 10; //Minimum size of selection
                    break;
                    case "end":
                        s = x;
                        if(x > plot.width())
                            s = plot.width();
                        if(x < f + 10)
                            s = f + 10; //Minimum size of selection

                    break;
                    case "move":
                        var dx = x -  rangeselection.moveStart;
                        if(f + dx < 0){
                            s -= f;
                            f = 0;
                        }else if (s+dx > plot.width()){
                            f = plot.width() - (s - f);
                            s = plot.width();
                        }else{
                            s += dx;
                            f += dx;
                        }
                    break; 
                }
                ctx.clearRect(0,0,plot.width(),plot.height());
                drawSelection(plot, ctx,  xaxis.c2p(f),  xaxis.c2p(s));
                return;
            }
            var series,data;                
            if(rangeselection.end === null){
                if(o.rangeselection.end === null){
                    series = plot.getData();
                    data = series[0].data;
                    rangeselection.end = data[data.length-1][0];
                }else{
                    rangeselection.end = o.rangeselection.end;
                }
            }
            if(rangeselection.start === null){
                if(o.rangeselection.start === null){
                    series = plot.getData();
                    data = series[0].data;
                    var date = new Date(rangeselection.end);
                    if(date.getMonth() > 0){
                        date.setMonth(date.getMonth() - 1);
                    }else{
                        date.setYear(date.getYear() - 1);
                        date.setMonth(11);
                    }
                    if(data[0][0] > date.valueOf()){
                        rangeselection.start = data[0][0];
                    }else{
                        rangeselection.start = date.valueOf();
                    }
                }else{
                    rangeselection.start = o.rangeselection.start;
                }
                
            }
            drawSelection(plot, ctx, rangeselection.start, rangeselection.end);
            
        });
        plot.hooks.shutdown.push(function(plot, eventHolder){
           eventHolder.unbind("mousemove", onMouseMove);
           eventHolder.unbind("mousedown", onMouseDown);
           if(mouseUpHandler)
               $(document).unbind("mouseup", mouseUpHandler);
        });
    }
    $.plot.plugins.push({
       init: init,
       options: {
           rangeselection: {
               color: "#f88",
               start: null,
               enabled: false,
               end: null,
               callback: null
           }
       },
       name: 'rangeselector',
       version: '1.1'
    });
})(jQuery);
