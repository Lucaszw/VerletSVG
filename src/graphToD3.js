require('./graphToD3.css');

const d3 = require('d3');
const yo = require('yo-yo');
const magicFabric = require('./magicFabric');

module.exports = (doc, svgUrl, options={}) => {
  let borderPoints = options.borderPoints || 100;
  let internalPoints = options.internalPoints || 300;
  let zoom = options.zoom || 0.5;
  let xRay = options.xRay || false;
  let noHover = options.noHover || false;
  let noContours = options.noContours || false;
  let nodeRadius = options.nodeRadius || 20;
  let bandwidth = options.bandwidth || 11;
  let threshold = options.threshold || 0.018;
  let noFixed = options.noFixed || false;
  let height = options.height || 500;
  let width = options.width || 500;
  let scale = options.scale || 1;
  let margin = options.margin || 23;
  let fixedBias = options.fixedBias || 0;
  let linkStrength = options.linkStrength || 1.5;

  const container = yo`
    <div style="zoom:${zoom}; width:${width}px; height:${height}px; overflow:hidden;">
      <canvas style="position:absolute;top;0px;left:0px" width="${width}" height="${height}">
      </canvas>
      <svg style="position:absolute;top;0px;left:0px" width="${width}" height="${height}" id="d3Container">
      </svg>
    </div>
  `;

  doc.appendChild(container);

  let simulation, graph;

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  function transform(data, axis) {
    return (margin + data) * scale;
  }

  let prevId = null;

  let clearId = (id) => {
    simulation.force(id, null);
    prevId = null;
  };

  function mouseover(d, nodes) {
    let strength = 0.01;

    if (noHover == true) return;
    // if (prevId) clearId();

    let ticks = 0;
    let interval;

    simulation.force(d.id, d3.forceRadial(1,d.x,d.y).strength(strength));
    prevId = d.id;

    interval = setInterval(()=>{
      if (ticks > 20) {
        clearInterval(interval);
        clearId(d.id);
      } else {
        ticks ++;
        simulation.force(d.id, d3.forceRadial(1,d.x,d.y).strength(strength/ticks));
      }
    }, 10);


  }

  function moveAtAngle(bbox, mouseEvent) {
    moveStrength = 0.025;
    let center = {
      x: bbox.left + bbox.width/2,
      y: bbox.top + bbox.height/2
    };

    let mouse = {
      x: mouseEvent.clientX/zoom,
      y: mouseEvent.clientY/zoom
    };

    let dx = mouse.x - center.x;
    let dy = mouse.y - center.y;

    let angle = Math.atan(dy/dx);

    // XXX: atan only works for top right quadrant so bias the angle based
    // on the sign of x & y
    if (dx < 0 ) angle += Math.PI;
    else if (dy < 0 ) angle += 2* Math.PI;

    let Fx = moveStrength*Math.cos(angle);
    let Fy = moveStrength*Math.sin(angle);
    let Dx = (bbox.width)*Math.cos(angle);
    let Dy = (bbox.height)*Math.sin(angle);

    simulation.force("x", null);
    simulation.force("y", null);

    simulation.force("x", d3.forceX(center.x+Dx).strength(Fx));
    simulation.force("y", d3.forceY(center.y+Dy).strength(Fy));
  }

  let xhr=new XMLHttpRequest();
  let div = document.createElement("div");

  xhr.onload = (...args) => {
    div.innerHTML = xhr.responseText;
    graph = magicFabric(div.firstChild, {borderPoints, internalPoints, noFixed, fixedBias});

    var svg = d3.select(container.querySelector("svg"));


    var canvas = d3.select(container.querySelector("canvas"));
    var context = canvas.node().getContext('2d');

    context.fillStyle = '#333333';
    context.strokeStyle = '#000000';
    var path = d3.geoPath().context(context);

    simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.edges).id(function(d) { return d.id; })
        .strength(linkStrength)
        .distance((d) => {
          return d.distance;
        }))
        .alphaDecay(0.001)
        .on("tick", ticked);
        // .force("charge", d3.forceManyBody()
        // .strength(-5))
    var link = svg.append("g")
        .attr("class", "links")
      .selectAll("line")
      .data(graph.edges)
      .enter().append("line")
        .attr("stroke-width", function(d) { return 0.5 })
        .attr("stroke", function (d) {
          if (xRay) return "rgba(93, 93, 93, 0.1)";
          return null;
        });
    var node = svg.append("g")
        .attr("class", "nodes")
      .selectAll("circle")
      .data(graph.nodes)
      .enter().append("circle")
        .attr("r", nodeRadius)
        .attr("stroke", "rgba(193, 193, 193, 0)")
        .attr("fill", function(d) {
          if (noContours == true) return "rgba(0,0,0, 1)"
          return "rgba(0,0,0, 0)"
        })
        .on("mouseover", mouseover)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("title")
        .text(function(d) { return d.id; });

    function ticked(...args) {

     let data = d3.contourDensity()
           .x(function(d) { return transform(d.x); })
           .y(function(d) { return transform(d.y); })
           .size([width, height])
           .bandwidth(bandwidth)
           .thresholds([threshold])
         (graph.nodes)

     context.fillStyle = 'none';
     context.strokeStyle = 'black';
     context.clearRect(0, 0, width, height);

     context.beginPath();
     path(data[0]);

     if (noContours == false) {
       if (xRay == false) context.fill();
       context.stroke();
     }

      link
          .attr("x1", function(d) { return transform(d.source.x); })
          .attr("y1", function(d) { return transform(d.source.y); })
          .attr("x2", function(d) { return transform(d.target.x); })
          .attr("y2", function(d) { return transform(d.target.y); });

      node
          .attr("cx", function(d) {
            return transform(d.x);
          })
          .attr("cy", function(d) { return transform(d.y); });

    }
  };

  xhr.open("GET",svgUrl,true);
  xhr.send();

  return {moveAtAngle};
};
