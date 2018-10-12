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
let tr = yo`<div id="marker2" style="${Styles.corner}" class="corner" ></div>`;
let bl = yo`<div id="marker4" style="${Styles.corner}" class="corner" ></div>`;
let br = yo`<div id="marker6" style="${Styles.corner}" class="corner" ></div>`;

module.exports = (container) => {
  container.style.border = "3px solid red";

  const transform2d = (...points) => {
    console.log(container);
    let w = parseFloat(container.style.width), h = parseFloat(container.style.height);
    console.log({w, h});

    transform = PerspT([0,0,w,0,0,h,w,h], points);

    t = transform.coeffs;
    t = [t[0], t[3], 0, t[6],
         t[1], t[4], 0, t[7],
         0   , 0   , 1, 0   ,
         t[2], t[5], 0, t[8]];


     t = "matrix3d(" + t.join(", ") + ")";
     container.style["-webkit-transform"] = t;
     container.style["-moz-transform"] = t;
     container.style["-o-transform"] = t;
     container.style.transform = t;

  }
  const initTransform = () => {
    let markers = document.body.querySelectorAll(".corner");
    transform2d(...corners);

    for (let i = 0; i != 8; i += 2) {
      var marker = _.find(markers, {id: `marker${i}`});
      marker.style.left = corners[i] + "px";
      marker.style.top  = corners[i + 1] + "px";
    };

  };

  const update = () => {
    let markers = document.body.querySelectorAll(".corner");
    for (var i = 0; i != 8; i += 2) {
      var marker = document.getElementById(`marker${i}`);
      marker.style.left = corners[i] + "px";
      marker.style.top = corners[i + 1] + "px";
    }

    transform2d(...corners);
  }

  const mouseup = (e) => {
    currentcorner = -1;
  };

  const mousemove = (e) => {
    let x, y;

    x = e.pageX;
    y = e.pageY;

    if (currentcorner < 0) return;

    corners[currentcorner] = x;
    corners[currentcorner + 1] = y;

    update();
  };

  const mousedown = (e) => {
    let cornerElem = document.body.querySelectorAll(".corner");
    if (_.get(cornerElem, "[0].style.display") == "none") return;
    let x, y, dx, dy;
    let best = 1000;
    x = e.pageX;
    y = e.pageY;
    console.log({x, y});
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
  };

  const keyup = (e) => {

    if (e.key == "h") {

      if (document.querySelector(".corner").style.display !== "none") {
        document.querySelectorAll(".corner").forEach((c) => {
          c.style.display = "none";
        });
        container.style.border = "none";
      } else {
        document.querySelectorAll(".corner").forEach((c) => {
          c.style.display = "block";
        });
        container.style.border = "3px solid red";
      }
    }
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
      if (corner.id == "marker2") {
        corner.style.left = `${bbox.left+bbox.width}px`;
        corner.style.top = `${bbox.top}px`
      }
      if (corner.id == "marker4") {
        corner.style.left = `${bbox.left}px`;
        corner.style.top = `${bbox.top+bbox.height}px`
      }
      if (corner.id == "marker6") {
        corner.style.left = `${bbox.left+bbox.width}px`;
        corner.style.top = `${bbox.top+bbox.height}px`
      }
    });


    initTransform();

    document.body.addEventListener("mousedown", mousedown);
    document.body.addEventListener("mousemove", mousemove);
    document.body.addEventListener("mouseup", mouseup);

  })

  document.body.addEventListener("keyup", keyup);

}
