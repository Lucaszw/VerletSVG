require('./graphToD3.css');

const d3 = require('d3');
const yo = require('yo-yo');
const magicFabric = require('./magicFabric');

module.exports = (doc, svgUrl, options={}) => {
  let borderPoints = options.borderPoints || 100;
  let internalPoints = (options.internalPoints == undefined) ? 300 : options.internalPoints;
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
  let distanceModifier = options.distanceModifier || 0;
  let maxEdgeDistance = options.maxEdgeDistance || null;
  let offsetX = options.offsetX || 0;
  let offsetY = options.offsetY || 0;
  let cellSize = options.cellSize || 4;

  let containerStyle = `
    width: 100%;
    height: 100%;
    /* overflow: hidden; */
  `;

  let svgStyle = `
      position: absolute;
      top: 0px;
      left: 0px;
      width: 100%;
      height: 100%;
  `;
  let canvasStyle = `
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
  `;


  const container = yo`
    <div style="${containerStyle}">
      <canvas width="100%" height="100%" style="${canvasStyle}">
      </canvas>
      <svg style="${svgStyle}"
        preserveAspectRatio="none"
        id="d3Container">
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

  let oldWidth, oldHeight;
  function transform(data, axis) {
    if (axis == "x") {
      return data*scale + offsetX;
    }

    if (axis == "y") {
      return data*scale + offsetY;
    }

    return data;
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

  let pointTimeout;

  function forceAtPoint(x, y, options={}) {
    let strength = options.strength || 1;
    let radius = options.radius || 1;
    let timeout = options.timeout || 500;
    let drawMode = options.drawMode || false;
    let group = options.group == undefined ? 0 : options.group;

    if (pointTimeout) {
      clearTimeout(pointTimeout);
    }
    simulation.force("point", null);

    simulation.force("point",
      d3.forceRadial(radius,x,y).strength((d) => {
        if (group == d.group) {
          return strength*Math.random()**2;
        }
        else {
          return 0;
        }
      })
    );

    if (timeout != -1)
      pointTimeout = setTimeout(()=>{
        simulation.force("point", null);
      }, timeout);
  }

  function moveAtAngle(mouseEvent) {
    let bbox = container.querySelector(".nodes").getBoundingClientRect();
    if (noHover == true) return;
    moveStrength = 0.05;
    let center = {
      x: bbox.left + bbox.width/2,
      y: bbox.top + bbox.height/2
    };

    let mouse = {
      x: mouseEvent.clientX,
      y: mouseEvent.clientY
    };

    let dx = mouse.x - center.x;
    let dy = mouse.y - center.y;

    let angle = Math.atan(dy/dx);

    // XXX: atan only works for top right quadrant so bias the angle based
    // on the sign of x & y
    if (dx < 0) angle += Math.PI;
    else if (dy < 0 ) angle += 2*Math.PI;

    let Fx = Math.abs(moveStrength*Math.cos(angle));
    let Fy = Math.abs(moveStrength*Math.sin(angle));
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
    graph = magicFabric(div.firstChild, {
      borderPoints,
      internalPoints,
      noFixed,
      fixedBias,
      maxEdgeDistance
    });

    var svg = d3.select(container.querySelector("svg"));

    simulation = d3.forceSimulation(graph.nodes)
        .force("link", d3.forceLink(graph.edges).id(function(d) { return d.id; })
        .strength(linkStrength)
        .distance((d) => {
          return d.distance + distanceModifier;
        }))
        .alphaDecay(0)
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
    var event = new Event('node-clicked');
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
        .on("click", (d) => {
          console.log("click!");
          event.data = d;
          document.dispatchEvent(event);
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));

    node.append("title")
        .text(function(d) { return d.id; });

    var canvas = container.querySelector("canvas");
    var context = canvas.getContext('2d');
    context.fillStyle = 'none';
    context.strokeStyle = 'black';
    var path = d3.geoPath().context(context);

    function ticked(...args) {

     let containerBounds = container.getBoundingClientRect();

     // XXX: Canvas drawing scale based on canvas width & height attributes!!
     canvas.width = containerBounds.width;
     canvas.height = containerBounds.height;

     let data = d3.contourDensity()
           .x(function(d, ...args) {
             return transform(d.x, "x");
           })
           .y(function(d) {
             return transform(d.y, "y");
           })
           .size([containerBounds.width, containerBounds.height])
           .bandwidth(bandwidth)
           .thresholds([threshold])
           .cellSize(cellSize)
         (graph.nodes);

     context.clearRect(0, 0, containerBounds.width, containerBounds.height);
     context.beginPath();

     path(data[0]);

     if (noContours == false) {
       if (xRay == false) context.fill();
       context.stroke();
     }

      link
          .attr("x1", function(d) { return transform(d.source.x, "x"); })
          .attr("y1", function(d) { return transform(d.source.y, "y"); })
          .attr("x2", function(d) { return transform(d.target.x, "x"); })
          .attr("y2", function(d) { return transform(d.target.y, "y"); });

      node
          .attr("cx", function(d) {
            return transform(d.x, "x");
          })
          .attr("cy", function(d) { return transform(d.y, "y"); });

    }
  };

  xhr.open("GET",svgUrl,true);
  xhr.send();

  return {moveAtAngle, forceAtPoint};
};
