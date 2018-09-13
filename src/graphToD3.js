require('./graphToD3.css');

const d3 = require('d3');
const yo = require('yo-yo');
const magicFabric = require('./magicFabric');

module.exports = (doc, svgUrl) => {
  const container = yo`
    <div style="zoom:0.5">
      <canvas style="position:fixed;top;0px;left:0px" width="900" height="900">
      </canvas>
      <svg style="position:fixed;top;0px;left:0px" width="900" height="900" id="d3Container">
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

  function scale(data) {
    return data / 1;
  }

  function mouseover(d, nodes) {

    let magnitude = Math.sqrt(Math.abs(d.vx || 0)**2 + Math.abs(d.vy || 0)**2);
    if (magnitude > 1) return;

    let sign;
    sign = Math.random() < 0.5 ? -1 : 1;
    d.vx = sign*1000;
    sign = Math.random() < 0.5 ? -1 : 1;
    d.vy = sign*1000;
    // console.log({this: this, args});
  }

  let xhr=new XMLHttpRequest();
  let div = document.createElement("div");

  xhr.onload = (...args) => {
    div.innerHTML = xhr.responseText;
    graph = magicFabric(div.firstChild);

    var svg = d3.select("svg"),
        width = +svg.attr("width"),
        height = +svg.attr("height");

    var canvas = d3.select("canvas");
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
        .on("tick", ticked);

    var link = svg.append("g")
        .attr("class", "links")
      .selectAll("line")
      .data(graph.edges)
      .enter().append("line")
        .attr("stroke-width", function(d) { return 0.1 });

    var node = svg.append("g")
        .attr("class", "nodes")
      .selectAll("circle")
      .data(graph.nodes)
      .enter().append("circle")
        .attr("r", 30)
        .attr("stroke", "rgba(193, 193, 193, 0)")
        .attr("fill", function(d) { return "rgba(0,0,0, 0)" })
        .on("mouseover", mouseover)
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("title")
        .text(function(d) { return d.id; });

    function ticked(...args) {

     let data = d3.contourDensity()
           .x(function(d) { return scale(d.x); })
           .y(function(d) { return scale(d.y); })
           .size([width, height])
           .bandwidth(11)
           .thresholds([0.018])
         (graph.nodes)

     context.fillStyle = 'none';
     context.strokeStyle = 'black';
     context.clearRect(0, 0, width, height);

     context.beginPath();
     path(data[0]);
     context.fill();
     context.stroke();

      link
          .attr("x1", function(d) { return scale(d.source.x); })
          .attr("y1", function(d) { return scale(d.source.y); })
          .attr("x2", function(d) { return scale(d.target.x); })
          .attr("y2", function(d) { return scale(d.target.y); });

      node
          .attr("cx", function(d) { return scale(d.x); })
          .attr("cy", function(d) { return scale(d.y); });

    }
  };

  xhr.open("GET",svgUrl,true);
  xhr.send();
};
