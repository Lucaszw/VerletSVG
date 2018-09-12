require('./graphToD3.css');

const d3 = require('d3');
const yo = require('yo-yo');

const applyStyles = (doc) => {
  // .links {
  //   /* stroke: rgba(51, 51, 51, 0.1); */
  //   /* stroke: rgb(16, 142, 233); */
  // }
  // .domain {
  //   display: none;
  // }
}
module.exports = (graph, doc) => {
  const div = yo`
    <div style="zoom:0.5">
      <canvas style="position:fixed;top;0px;left:0px" width="900" height="900">
      </canvas>
      <svg style="position:fixed;top;0px;left:0px" width="900" height="900" id="d3Container">
      </svg>
    </div>
  `;

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

  let div = document.createElement("div");
  let xhr=new XMLHttpRequest();
  
} ;
