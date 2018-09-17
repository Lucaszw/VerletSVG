const earcut = require('earcut');
const svgIntersections = require('svg-intersections');
const SVG = require('svg.js');
const _ = require('lodash');
const turf = require('@turf/turf');

const Ray = (x1,y1,x2,y2) => {
  return svgIntersections.shape("line", { x1, y1, x2, y2 });
}

const constructShape = (element) => {
  let shape = null;
  switch (element.tagName) {
  case "g":
    shape = constructShape(element.querySelector("#outer"));
    let holes = _.map(element.querySelectorAll("#inner"), (s) => {
      return [constructShape(s), s];
    });
    shape.isGroup = true;
    shape.holes = holes;
    shape.shape = SVG.adopt(element.querySelector("#outer"));
    return shape;
  case "path":
    const d = element.getAttribute("d");
    shape = svgIntersections.shape("path", {d});
    shape.shape = SVG.adopt(element);
    return shape;
    break;
  case "polygon":
    const pointAttr = element.points;
    const points = _.map(pointAttr, (p) => `${p.x},${p.y}`).join(" ");
    shape = svgIntersections.shape("polygon", {points});
    shape.shape = SVG.adopt(element);
    return shape;
    break;
  case "circle":
    const cx = element.getAttribute("cx");
    const cy = element.getAttribute("cy");
    const r = element.getAttribute("r");
    shape = svgIntersections.shape("circle", {cx, cy, r});
    shape.shape = SVG.adopt(element);
    return shape;
    break;
  }
  return null;
}

const castRay = (ray, shape) => {
  return svgIntersections.intersect(ray,shape);
};

const triangleToEdges = (t) => {
  let edges = [];
  edges[0] = {source: t[0], target: t[1], value: 1};
  edges[1] = {source: t[1], target: t[2], value: 1};
  edges[2] = {source: t[2], target: t[0], value: 1};
  return edges;
}

const pointToNode = (p) => {
  let x = p[0];
  let y = p[1];
  return {"id": x + y*1000, "group": 1};
};

const fetchId = (x, y) => {
  return `${x + (y*1000)}`;
};


const constructPolygonCoordinates = (shape, box, borderPoints) => {
  let polygonCoordinates = [];
  let travelDistanceY = ((box.y2 - box.y)/borderPoints);
  let travelDistanceX = ((box.x2 - box.x)/borderPoints);

  // Start:
  // let intersections, ray, iStart;
  // for (let i=0;i<100;i++) {
  //   if (_.get(intersections, "points[0]")) break;
  //   ray = Ray(0,box.y+i*travelDistanceY,1000,box.y+i*travelDistanceY);
  //   intersections = castRay(ray, shape);
  // }

  // let start = intersections.points[0];
  // let end = intersections.points[1];
  // polygonCoordinates = [...polygonCoordinates, [start.x, start.y]];

  const addCoordinate = (direction,xy) => {
    let p1;
    let p2;
    switch (direction) {
      case "left":
        p1 = {x: -10000, y: xy};
        p2 = {x: 10000, y: xy};
        break;
      case "bottom":
        p1 = {x: xy, y: 10000};
        p2 = {x: xy, y: -10000};
        break;
      case "right":
        p1 = {x: 10000, y: xy};
        p2 = {x: -10000, y: xy};
        break;
      case "top":
        p1 = {x: xy, y: -1000};
        p2 = {x: xy, y: 10000};
        break;
    };

    ray = Ray(p1.x,p1.y,p2.x,p2.y);

    intersections = castRay(ray, shape);
    if (intersections.points.length < 1) return;

    let closest = _.minBy(intersections.points, (p) => {
      return Math.sqrt((p1.x-p.x)**2 + (p1.y-p.y)**2);
    });

    // point = intersections.points[0];
    polygonCoordinates = [...polygonCoordinates, [closest.x, closest.y]];
  }

  // Raster over shape to gather next point in segment
  for (let i = 1 ; i < borderPoints ; i++) {
    let y = box.y + travelDistanceY*i;
    addCoordinate("left", y);
  }

  for (let i = 1 ; i < borderPoints ; i++) {
    let x = box.x + travelDistanceX*i;
    addCoordinate("bottom", x);
  }

  for (let i = borderPoints - 1 ; i > 0 ; i--) {
    let y = box.y + travelDistanceY*i;
    addCoordinate("right", y);
  }

  for (let i = 0; i < borderPoints  ; i++) {
    let x = box.x2 - travelDistanceX*i;
    addCoordinate("top", x);
  }

  // If there is an end point (for flat surface shapes), add it
  // if (end) polygonCoordinates = [...polygonCoordinates, [end.x, end.y]];

  let [startX, startY] = polygonCoordinates[0];
  polygonCoordinates = [...polygonCoordinates, [startX, startY]];

  return polygonCoordinates;
}


module.exports = (svg, options) => {
  let borderPoints = options.borderPoints || 100;
  let internalPoints = options.internalPoints || 300;
  let noFixed = options.noFixed || false;
  let fixedBias = options.fixedBias || 0;
  
  var element = SVG.adopt(svg);
  let shape = constructShape(svg.querySelector("#MyShape"));
  let box = shape.shape.bbox();
  console.log({box, shape});

  let vertices  = [];
  let nodes = {};
  let edges = [];

  // Generate coordinates for constructing a polygon
  let polygonCoordinates = constructPolygonCoordinates(shape, box, borderPoints);
  console.log({polygonCoordinates});
  // Generate coordinates for holes in outer polygon
  let holeCoordinates = [];
  if (shape.isGroup && shape.holes.length > 0) {
    _.each(shape.holes, (h) => {
      let [hole, holeShape] = h;
      console.log({hole, holeShape});
      let box = hole.shape.bbox();
      console.log({box});
      let holeCoords = constructPolygonCoordinates(hole, box, borderPoints);
      holeCoordinates = [...holeCoordinates, holeCoords];
    });

    console.log({holeCoordinates});

  }

  // Generate polygon from coordinates using Turf.js
  let polygon = turf.polygon([polygonCoordinates], { name: 'shapeSurface' });

  // Generate set of random points inside polygon for triangulation
  let points = turf.randomPoint(internalPoints, {bbox: [box.x, box.y, box.x + box.width, box.y + box.height]});
  let pointsWithin = turf.pointsWithinPolygon(points, polygon);
  let outerPoints = [];

  // Remove points that reside inside holes
  _.each(holeCoordinates, (coords) => {
    let holePoly = turf.polygon([coords], { name: 'shapeSurface' });
    let pointsOutside = turf.pointsWithinPolygon(points, holePoly);
    _.each(pointsOutside.features, (p)=>{
      p.shouldDelete = true;
    });
    for (let i=0;i<coords.length;i++)
      outerPoints = [...outerPoints, turf.point(coords[i])];
  });

  for (let i=0;i<polygonCoordinates.length;i++)
    outerPoints = [...outerPoints, turf.point(polygonCoordinates[i])];

  pointsWithin.features = _.filter(pointsWithin.features, (f)=>{return !f.shouldDelete});

  points.features = [...outerPoints, ...pointsWithin.features];

  console.log({fetures: points.features});

  var tin = turf.tin(points);

  let triangles = _.map(tin.features, "geometry.coordinates[0]");

  for (let i=0;i<triangles.length;i++) {
    let t = triangles[i];
    for (let ii=0;ii<t.length;ii++) {
      let p = t[ii];
      let x = p[0];
      let y = p[1];
      let id = fetchId(p[0], p[1]);
      nodes[id] = {id, color: "black", x, y};
      if (Math.round(Math.random() + fixedBias) && !noFixed) {
        nodes[id].fx = x;
        nodes[id].fy = y;
        nodes[id].color = "red";
      }
    }

    for (let ii=0;ii<t.length-1;ii++) {

      let x1 = t[ii][0];
      let y1 = t[ii][1];

      let x2 = t[ii+1][0];
      let y2 = t[ii+1][1];

      let sourceId = fetchId(x1, y1);
      let targetId = fetchId(x2, y2);
      let distance = Math.sqrt((x2-x1)**2 + (y2-y1)**2);

      // Get center point
      let dx = x2-x1;
      let dy = y2-y1;
      let midpoint = turf.point([x1 + dx/2, y1+dy/2]);

      // Check if it exists within the bounds of original polygon
      // let withinBounds = turf.pointsWithinPolygon(midpoint, polygon).features.length;
      // if (withinBounds) {
        // Only add edges that don't cross bounds of SVG
        let edge = {source: sourceId, target: targetId, distance: distance};
        edges = [...edges, edge];
      // }
    }
    // Iterate through triangles
    // let triangle = trangles[i]
  }

  nodes = _.values(nodes);
  console.log({nodes, edges});

  return {nodes, edges};
}
