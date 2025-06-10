
        /* --------------------------------------------------------------------
                                        SVG
        ---------------------------------------------------------------------*/
        const lmargin = 50;
        const rmargin = 50;
        const tmargin = 50;
        const bmargin = 50;

            // The svg inherits the height of the parent element, so it rescales with the browser window.
            // svg width starts at 30% of browser window, will be recalculated below.
        const svg = d3.select('#jennifer').append('svg').attr('id','chart').attr('height', 'inherit').attr('width', '30%')
        .attr('style', 'background-color: whitesmoke;').attr('order', 1);

        const plotHeight = document.getElementById('chart').clientHeight - tmargin - bmargin;
            // plot height set to size of svg minus margins. Needed for scales

        const plotArea = svg.append('g').attr('id', 'plot').attr('transform', `translate(${lmargin}, ${tmargin})`);

        /* ----------------------------------------------------------------------
                                        MAP
        ------------------------------------------------------------------------*/

        d3.json('california_counties.geojson') 
        // now know topojson is faster. Not sure could colour by county with a continuous line, though.
            .catch(function (error) { console.log('Error: ', error) })
            .then(makeGraph)
 
        function makeGraph(data) 
        {
        let projection = d3.geoAlbers()  // USA-centered, conic one. Should give a good projection
            .fitHeight(plotHeight, data)

        let geoGenerator = d3.geoPath()
            .projection(projection);

        const map = plotArea.append('g').attr('id', 'map')
                    .selectAll('path').data(data.features).enter()
                    .append('path').attr('id', d => d.properties.NAME.replace(/ /g,'')) // id of county name without space
                    .attr('d', geoGenerator)
                    .attr('fill', 'none') // Just initialising here, will be changed below.
                    .attr('stroke','#C8C8C8');
        
        // COUNTY CLASSIFICATIONS
        d3.csv('county_classification.csv').catch(function (error) { console.log('Error: ', error) })
        .then(function(classifications)
        // function checks the id of each page and assigns it a class based on the classification spreadsheet. Used for customisation below.
        // Editing the JSON file directly would be better, but I ran out of time.
        {
            for (let i=0; i< classifications.length; i++)
                {
                let current = classifications[i].COUNTY.replace(/ /g,'');
                d3.select(`#${current}`).classed(classifications[i].CLASSIFICATION, 'true');
                }
            // fill map polygons by county classification
            d3.selectAll('path').attr('fill-opacity', '30%');
            d3.selectAll('path.Urban').attr('fill', '#7F7F7F');
            d3.selectAll('path.Suburban').attr('fill', '#C6A26D');
            d3.selectAll('path.Rural').attr('fill', '#228B22');
        });

        // SVG WIDTH
        /* The projection has a fixed aspect ratio, so here we're getting the width (the height is
        determined by the screen size and resetting the svg width to be that plus margins) */

        const plotWidth = plotArea.select('#map').node().getBBox().width;
        svg.attr('width', plotWidth + lmargin + rmargin);

        // LEGEND
        // Only used when county classifications are active.
        const classifications = ['Urban', 'Suburban', 'Rural'];
        const colours = ['#7F7F7F','#C6A26D','#228B22'];

        const legend = plotArea.append('g').attr('id','legend')
                .attr('transform', `translate(${plotWidth - 40} -30)`).attr('opacity', 1)
                .selectAll('rect').data(colours).enter()
                .append('rect').attr('width', 10).attr('height', 10).attr('x', 0).attr('y', (d,i) => i*15)
                .attr('fill', d => d).attr('fill-opacity', '50%').attr('stroke','black').attr('stroke-width', 0.5);
        
        d3.select('#legend').selectAll('text').data(classifications).enter()
                .append('text').attr('x', 15).attr('y', (d,i) => i*15 +10).text(d => d)
                .attr('fill', 'black').attr('font-size', 'small');
    
        /*--------------------------------------------------------------
                                 SCALES, AXES & GRIDLINES
        --------------------------------------------------------------*/

        // The coordinates are in a variable, multi-level array. Collapse it to find max and min.
        const coords = data.features.map(function (d) { return d.geometry.coordinates }).flat(Infinity);
        // Even indices are the longitude coords, odd latitudes.
        const longs = coords.filter(function (v, i) {return i % 2 == 0});
        const lats = coords.filter(function (v, i) {return i % 2 == 1});

        const minX = d3.min(longs);
        const maxX = d3.max(longs);
        
        const minY = d3.min(lats);
        const maxY = d3.max(lats);

        const xScale = d3.scaleLinear()
            .domain([minX, maxX])
            .range([0, plotWidth]);

        const yScale = d3.scaleLinear()
            .domain([minY, maxY])
            .range([plotHeight, 0]);

        const axesGroup = plotArea.append('g').attr('id', 'axesGroup').attr('opacity', 0)
            // This group contains both axes, so we can hide them later.
            .attr('color', 'black');

        const xAxis = d3.axisBottom(xScale);

        const xAxisGroup = axesGroup.append('g').attr('id', 'xAxisGroup')
            .attr('transform', `translate(0,${yScale(minY)})`)
            .call(xAxis);

        xAxisGroup.append('text').text('Longitude')
            .attr('text-anchor', 'middle').attr('fill', 'black')
            .attr('font-size', 'medium').attr('font-weight','bold')
            .attr('transform', `translate(${plotWidth / 2} ${2 * bmargin / 3})`);
            
        const yAxis = d3.axisLeft(yScale);

        const yAxisGroup = axesGroup.append('g').attr('id', 'yAxisGroup')
            .attr('transform', `translate(${xScale(minX)}, 0)`)
            .call(yAxis);

        yAxisGroup.append('text').text('Latitude')
            .attr('text-anchor', 'middle').attr('fill', 'black')
            .attr('font-size', 'medium').attr('font-weight','bold')
            .attr('transform', `translate(${- 2 * lmargin/3} ${plotHeight/2}) rotate(270)`);

        // GRIDLINES
        const xGrid = d3.axisBottom(xScale).tickSize(-plotHeight);

        const xGridGroup = plotArea.append('g').attr('id', 'xGridGroup').attr('opacity', 0)
            .attr('transform', `translate(0,${yScale(minY)})`)
            .attr('color', '#666666')
            .call(xGrid);

        const yGrid = d3.axisLeft(yScale).tickSize(-plotWidth);

        const yGridGroup = plotArea.append('g').attr('id', 'yGridGroup').attr('opacity', 0)
            .attr('transform', `translate(${xScale(minX)}, 0)`)
            .attr('color', '#666666')
            .call(yGrid);
        
        /*---------------------------------------------------------
                                SCATTER CHART
        ------------------------------------------------------------*/

        // TOOLTIPS

        const tooltip = d3.select('#jennifer').append('div').attr('class', 'tooltip');
        //styling done in main CSS file so all maps are the same.
        
        const mouseOver = function(event, d) {
            tooltip.style('display', 'block') // Must be style, attr doesn't work.
                .html(`${d.name} Fire<br />${d.county} County<br />${d.year}<br />Coords: ${d.longitude}, ${d.latitude}`)
                .style('left', event.pageX + 'px') // Position the tooltip div by the current dot
                .style('top', event.pageY + 'px');
            d3.select(this).attr('fill', '#B20000').attr('r', 5);
            };

        const mouseLeave = function(d) {
            tooltip.style('display', 'none')
            d3.select(this).attr('fill', '#e27822').attr('r', 4)
            };

        // SCATTER

        d3.csv('fire_locations.csv')
            .catch(function (error) { console.log('Error: ', error) })
            .then(function (data) {
                plotArea.append('g').attr('id', 'scatter')
                .selectAll('circle').data(data).enter()
                .append('circle').attr('r', 4).attr('fill', '#e27822').attr('opacity', 1)
                .each(function(d) {const loc = projection([d.longitude, d.latitude]); // Uses the map projection function
                    d3.select(this).attr('cx', loc[0]).attr('cy', loc[1]).attr('class', `c${d.year}`); // Classes can't start with a number.
                })
                .on('mouseover', mouseOver)
                .on('mouseleave', mouseLeave)              
            });

        // MAJOR LANDMARKS
        // Using the map projection function to put fixed points on the map to aid in visualising locations.
    
        const landmarks = [{'name': 'Los Angeles', 'coords': [-118.2426, 34.0549]}, {'name': 'San Francisco', 'coords': [-122.4194, 37.7749]}, 
        {'name': 'San Diego', 'coords': [-117.1611,32.7157]},{'name': 'Fresno', 'coords': [-119.7871,36.7378]},
        {'name': 'Sacramento', 'coords':[-121.4944, 38.5781]}, {'name':'Mojave Desert', 'coords': [-115.4734,35.0110]},
        {'name': 'Death Valley', 'coords':[-116.9325,36.5323]}];

        plotArea.append('g').attr('id', 'landmarksGroup').attr('opacity', 1) // opacity so can change it later.
            .selectAll('circle').data(landmarks).enter()
            .append('circle').attr('r', 2).attr('fill', 'black')
            .each(function(d){const loc = projection(d.coords)
                d3.select(this).attr('cx', loc[0]).attr('cy', loc[1])
            });
            
        plotArea.select('#landmarksGroup').selectAll('text').data(landmarks).enter()
                .append('text').attr('fill', 'black')
                .each(function(d){const loc = projection(d.coords)
                    d3.select(this).attr('x', loc[0]).attr('y', loc[1]).attr('dx', 0).attr('dy', 15) // positioning city name relative to city dot
                    .text(d.name).attr('text-anchor', 'middle').attr('font-size', 'small')
            });

        }; // End of makeGraph function
            
        /*----------------------------------------------------------------
                                 GRAPH CUSTOMISATION FUNCTIONS
        ------------------------------------------------------------------*/

        const hide_or_not = function(box_id, group_id)
            // Function for checkboxes
            {
            const isChecked = document.getElementById(box_id).checked; // Check if box is checked.
            if (isChecked) 
                {d3.select(group_id).attr('opacity', 1);}
            else 
                {d3.select(group_id).attr('opacity', 0);}
            };

        const countyLines = function()
            // Function to hide/show county lines.
            {
            const linesChecked = document.getElementById('countiesBox').checked;
            if (linesChecked) 
                {d3.selectAll('#map path').attr('stroke','#C8C8C8');}
            else 
                {d3.selectAll('#map path').attr('stroke','none');}
            };

        const classify = function()
            // Function for map fill colour - plain or by county classification (Urban, Suburban, Rural)
            {
            const isChecked = document.getElementById('classifyBox').checked;
            if (isChecked)
                {d3.selectAll('path').attr('fill-opacity', '30%');
                 d3.selectAll('path.Urban').attr('fill', '#7F7F7F');
                 d3.selectAll('path.Suburban').attr('fill', '#C6A26D');
                 d3.selectAll('path.Rural').attr('fill', '#228B22');
                 d3.select('#legend').attr('opacity', 1); // Shows legend
                }
            else
                {d3.selectAll('path').attr('fill', '#fcf4e8').attr('fill-opacity', '100%');
                d3.select('#legend').attr('opacity', 0); // Hides the legend
                }
            };

        const gridOptions = function()
            // Function disables gridline boxes if axes box is not ticked.
            {
            const isChecked = document.getElementById('axesBox').checked;
            if (isChecked)
                {d3.select('#xGridBox').attr('disabled', null);
                d3.select('#yGridBox').attr('disabled', null);
            }
            else 
                {d3.select('#xGridBox').property('checked', false).attr('disabled', 'disabled');
                d3.select('#xGridGroup').attr('opacity', 0);
                d3.select('#yGridBox').property('checked', false).attr('disabled', 'disabled');
                d3.select('#yGridGroup').attr('opacity', 0);
            }
            };

        const updateYear = function()  
            // Function for dropdown
            {
            const selectedOption = d3.select(this).property('value');
            plotArea.selectAll('#scatter circle').attr('opacity', 0);
            switch(selectedOption) {
                case 'all': plotArea.selectAll('#scatter circle').attr('opacity', 1); break;
                case '2023': plotArea.selectAll('#scatter circle.c2023').attr('opacity', 1); break;
                case '2022': plotArea.selectAll('#scatter circle.c2022').attr('opacity', 1); break;
                case '2021': plotArea.selectAll('#scatter circle.c2021').attr('opacity', 1); break;
                case '2020': plotArea.selectAll('#scatter circle.c2020').attr('opacity', 1); break;
                case '2019': plotArea.selectAll('#scatter circle.c2019').attr('opacity', 1); break;
                }
            };