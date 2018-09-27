const PerspT = require('perspective-transform');
const yo = require('yo-yo');
const _ = require('lodash');

const Styles = {
  corner: `
  position: absolute;
  top: 0px; left: 0px;
  border: 1px solid blue;
  border-radius: 20px;
  padding: 10px;
  background: rgba(255,255,255,0.5);
  user-select: none;
  z-index: 20;
  cursor: move;
`
};

let corners = [100, 100, 300, 100, 100, 300, 300, 300];
let currentcorner = -1;

let tl = yo`<div id="marker0" style="${Styles.corner}" class="corner" ></div>`;
let tr = yo`<div id="marker1" style="${Styles.corner}" class="corner" ></div>`;
let bl = yo`<div id="marker2" style="${Styles.corner}" class="corner" ></div>`;
let br = yo`<div id="marker3" style="${Styles.corner}" class="corner" ></div>`;

module.exports = (container) => {

  // const transform2d(...points) {
  //   let box = this.element.querySelector("#box");
  //
  // }
  // const initTransform = () => {
  //   markers = document.body.querySelectorAll(".corner");
  //
  // };

  const mousedown = (e) => {
    let bbox = container.getBoundingClientRect();
    let cornerElem = document.body.querySelectorAll(".corner");
    if (_.get(cornerElem, "[0].style.display") == "none") return;
    let x, y, dx, dy;
    let best = 1000;
    x = e.pageX - bbox.left;
    y = e.pageY - bbox.top;
    currentcorner = -1;

    for (var i = 0; i != 8; i += 2) {
      dx = x - corners[i];
      dy = y - corners[i + 1];
      if (best > dx*dx + dy*dy) {
        best = dx*dx + dy*dy;
        currentcorner = i;
      }
    }

    console.log({currentcorner});
  }


  // XXX: Listen for ready signal
  (new Promise((res, rej)=>setTimeout(res, 1000))).then(()=> {

    let bbox = container.getBoundingClientRect();
    _.each([tl, tr, bl, br], (corner) => {
      document.body.appendChild(corner);
      if (corner.id == "marker0") {
        corner.style.left = `${bbox.left}px`;
        corner.style.top = `${bbox.top}px`;
      }
      if (corner.id == "marker1") {
        corner.style.left = `${bbox.left+bbox.width}px`;
        corner.style.top = `${bbox.top}px`
      }
      if (corner.id == "marker2") {
        corner.style.left = `${bbox.left}px`;
        corner.style.top = `${bbox.top+bbox.height}px`
      }
      if (corner.id == "marker3") {
        corner.style.left = `${bbox.left+bbox.width}px`;
        corner.style.top = `${bbox.top+bbox.height}px`
      }
    });

    document.body.addEventListener("mousedown", mousedown);
  })

}
