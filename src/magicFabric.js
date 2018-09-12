const earcut = require('earcut');
const svgIntersections = require('svg-intersections');
const SVG = require('svg.js');
const _ = require('lodash');
const turf = require('@turf/turf');

const Ray = (x1,y1,x2,y2) => {
  return svgIntersections.shape("line", { x1, y1, x2, y2 });
}

const constructShape = (element) => {
  switch (element.tagName) {
  case "path":
    const d = element.getAttribute("d");
    return svgIntersections.shape("path", {d});
    break;
  case "polygon":
    const pointAttr = element.points;
    const points = _.map(pointAttr, (p) => `${p.x},${p.y}`).join(" ");
    return svgIntersections.shape("polygon", {points});
    break;
  case "circle":
    const cx = element.getAttribute("cx");
    const cy = element.getAttribute("cy");
    const r = element.getAttribute("r");
    return svgIntersections.shape("circle", {cx, cy, r});
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


module.exports = (svg) => {
  var element = SVG.adopt(svg);
  let shape = constructShape(svg.querySelector("#MyShape"));
  let box = element.viewbox();
  console.log({box, shape});

  let numberOfSteps = 100;
  let internalPoints = 300;
  let fixedRatio = 15;
  let travelDistance = ((box.height - box.x)/numberOfSteps);

  let vertices  = [];
  let nodes = {};
  let edges = [];

  let polygonCoordinates = [];

  // Start:
  let intersections, ray;
  for (let i=0;i<100;i++) {
    if (_.get(intersections, "points[0]")) break;
    ray = Ray(0,i,1000,i);
    intersections = castRay(ray, shape);
  }
  console.log({intersections});
  let start = intersections.points[0];
  let end = intersections.points[1];
  let fixedIds = [];
  polygonCoordinates = [...polygonCoordinates, [start.x, start.y]];

  // Raster over shape to gather next point in segment
  for (let i = 1 ; i < numberOfSteps ; i++) {
    let y = box.y + travelDistance*i;
    y = y;

    // Cast ray and get left most neighbour
    ray = Ray(0,y,1000,y);
    intersections = castRay(ray, shape);
    point = intersections.points[0];
    polygonCoordinates = [...polygonCoordinates, [point.x, point.y]];
    if (i % fixedRatio == 0)
      fixedIds = [...fixedIds, fetchId(point.x, point.y)];
  }

  // Once at bottom, scan upwards collecting right most neighbours
  for (let i = numberOfSteps - 1 ; i > 0 ; i--) {
    let y = box.y + travelDistance*i;
    y = y;

    // Cast ray and get right most neighbour
    ray = Ray(0,y,1000,y);
    intersections = castRay(ray, shape);

    // If the bottom of the surface is not flat, ignore intersection at end
    if (intersections.points.length < 1) continue;
    point = intersections.points[1];
    polygonCoordinates = [...polygonCoordinates, [point.x, point.y]];
    if (i % fixedRatio == 0)
      fixedIds = [...fixedIds, fetchId(point.x, point.y)];
  }

  // If there is an end point (for flat surface shapes), add it
  if (end) polygonCoordinates = [...polygonCoordinates, [end.x, end.y]];

  polygonCoordinates = [...polygonCoordinates, [start.x, start.y]];

  // Generate polygon from coordinates
  let polygon = turf.polygon([polygonCoordinates], { name: 'shapeSurface' });

  // Generate set of random points inside polygon for triangulation
  let points = turf.randomPoint(internalPoints, {bbox: [box.x, box.y, box.x + box.width, box.y + box.height]});
  let pointsWithin = turf.pointsWithinPolygon(points, polygon);

  let outerPoints = [];
  for (let i=0;i<polygonCoordinates.length;i++)
    outerPoints[i] = turf.point(polygonCoordinates[i]);

  points.features = [...outerPoints, ...pointsWithin.features];

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
      if (_.includes(fixedIds, id)) {
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
      let withinBounds = turf.pointsWithinPolygon(midpoint, polygon).features.length;
      if (withinBounds) {
        // Only add edges that don't cross bounds of SVG
        let edge = {source: sourceId, target: targetId, distance: distance};
        edges = [...edges, edge];
      }
    }
    // Iterate through triangles
    // let triangle = trangles[i]
  }
  console.log({fixedIds});

  nodes = _.values(nodes);
  console.log({nodes, edges});

  return {nodes, edges};
}
