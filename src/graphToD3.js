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
  const container = yo`
    <div style="zoom:${zoom}">
      <canvas style="position:absolute;top;0px;left:0px" width="900" height="900">
      </canvas>
      <svg style="position:absolute;top;0px;left:0px" width="900" height="900" id="d3Container">
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
    let margin = 23, scale = 1;
    return margin + data / scale;
  }

  function mouseover(d, nodes) {
    if (noHover == true) return;
    let magnitude = Math.sqrt(Math.abs(d.vx || 0)**2 + Math.abs(d.vy || 0)**2);
    // if (magnitude > 1) return;

    let sign;
    sign = Math.random() < 0.5 ? -1 : 1;
    d.vx = sign*500;
    sign = Math.random() < 0.5 ? -1 : 1;
    d.vy = sign*500;
    console.log({this: this, args});
  }

  let xhr=new XMLHttpRequest();
  let div = document.createElement("div");

  xhr.onload = (...args) => {
    div.innerHTML = xhr.responseText;
    graph = magicFabric(div.firstChild, {borderPoints, internalPoints});

    var svg = d3.select(container.querySelector("svg")),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    var canvas = d3.select(container.querySelector("canvas"));
    var context = canvas.node().getContext('2d');

    context.fillStyle = '#333333';
    context.strokeStyle = '#000000';
    var path = d3.geoPath().context(context);

    simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.edges).id(function(d) { return d.id; })
        .strength(2)
        .distance((d) => {
          return d.distance;
        }))
        .force("charge", d3.forceManyBody()
        .strength(-5))
        .on("tick", ticked);

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
           .bandwidth(11)
           .thresholds([0.018])
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
};
