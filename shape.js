/**
 * Created by liangyong on 2018/1/20.
 */

import * as d3 from "d3";
import X2JS  from "x2js";

export class Shape {
    constructor(svgId) {
        this.dom = d3.select("#" + svgId);
        this.width = this.dom.attr("width");
        this.height = this.dom.attr("height");
        this.nodes = [];
        this.edges = [];
        this.lines = null;
        this.frontArrows = null;
        this.backArrows = null;
        this.lineTextTotal = null;
        this.lineTextInput = null;
        this.lineTextOutput = null;
        this.nodeGroup = null;
        this.selectedNodes = [];

        this.ctrlPress = false;

        this.init();
    }

    init() {
        this.dom.node().oncontextmenu = function () {
            return false;
        };
        d3.select("body").on("keydown", () => {
            if (d3.event.ctrlKey || d3.event.keyCode == 17) {
                this.ctrlPress = true;
                console.log("ctrl已按下");
            }
        }).on("keyup", () => {
            if (d3.event.ctrlKey || d3.event.keyCode == 17) {
                this.ctrlPress = false;
                console.log("ctrl已松开");
            }
        });
        this.dom.on("click", () => {
            this.hideContextMenu();
            if (this.ctrlPress === false) {
                this.cancelNodeSelected();
            }
        });
        /*  this.container = this.dom.append("g");
         this.container.append("rect")
         .attr("width", this.width)
         .attr("height", this.height)
         .style("fill", "none")
         .style("pointer-events", "all");*/
        this.brush = this.dom.append("g").attr("class", "brush")
            .style("position", "fixed").style("display", "none");
        this.shapeContainer = this.dom.append("g").attr("id", "group_shape");
        this.dom.call(d3.zoom()
            .scaleExtent([0.2, 10])
            .on("zoom", () => {
                this.shapeContainer.attr("transform", d3.event.transform);
            }));

        this.brush.call(d3.brush()
            .extent([[0, 0], [this.width, this.height]])
            .on("start", function () {
                console.log("start");
            })
            .on("brush", function () {
                console.log("brush");
            })
            .on("end", function () {
                console.log("end");
            }));

        this.shapeContainer.append("g")
            .attr("id", "group_line")
            .attr("transform", "scale(0.5)")
            .attr("class", "edge");
        this.shapeContainer.append("g")
            .attr("id", "group_icon")
            .attr("transform", "scale(0.5)")
            .attr("class", "node");
    }

    loadData(url) {
        return d3.xml(url)
            .then(xml => {
                var x2js = new X2JS();
                var json = x2js.dom2js(xml);
                this.nodes = JSON.parse(json.SwscTopoByName.element.Nodes);
                this.edges = JSON.parse(json.SwscTopoByName.element.Edges);

                //this.shapeContainer.attr("transform", "translate(0,0) scale(1)");
                this.buildShape();
            });
    }

    buildNodeEdgeRelation() {
        this.nodes.forEach(node => {
            var typeX = typeof node.Nx, typeY = typeof node.Ny;
            if (typeX !== "number") {
                node.Nx = parseInt(node.Nx);
            }
            if (typeY !== "number") {
                node.Ny = parseInt(node.Ny);
            }
        });
        this.edges.forEach(edge => {
            edge.source = this.nodes.find(n => n.Svid === edge.Lsource);
            edge.target = this.nodes.find(n => n.Svid === edge.Ltarget);
        });
    }

    buildEdges() {
        d3.select("#group_line").selectAll("g").remove();
        var lineGroup = d3.select("#group_line").selectAll("g")
            .data(this.edges)
            .enter()
            .append("g")
            .attr("id", d => {
                return "group_line_" + d.Lid;
            });

        this.lines = lineGroup.append("path")
            .attr("id", d => {
                return d.Lid;
            })
            .attr("d", r => {
                if (r.source.Nx <= r.target.Nx) {
                    return "M" + r.source.Nx + "," + r.source.Ny + "L" + r.target.Nx + "," + r.target.Ny;
                }
                else {
                    return "M" + r.target.Nx + "," + r.target.Ny + "L" + r.source.Nx + "," + r.source.Ny;
                }
            })
            .attr("stroke", d => {
                return d.color ? d.color : "#555";
            });

        this.frontArrows = lineGroup.append("path")
            .attr("id", d => {
                return "front_" + d.Lid;
            })
            .attr("d", d => {
                return this.getLineArrow(d.source.Nx, d.source.Ny, d.target.Nx, d.target.Ny, 4, "front");
            });
        this.backArrows = lineGroup.append("path")
            .attr("id", d => {
                return "back_" + d.Lid;
            })
            .attr("d", d => {
                return this.getLineArrow(d.source.Nx, d.source.Ny, d.target.Nx, d.target.Ny, 4, "back");
            });

        this.lineTextTotal = lineGroup.append("text")
            .attr("id", d => {
                return "total_" + d.Lid;
            })
            .attr("font-size", "10px").attr("text-anchor", "middle")
            .attr("dx", d => {
                return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                        + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) / 2;
            }).attr("dy", "-5");
        this.lineTextTotal.append("textPath")
            .attr("xlink:href", d => {
                return "#" + d.Lid;
            }).text(function (d) {
            return d.totalText ? d.totalText : "";
        });
        this.lineTextInput = lineGroup.append("text")
            .attr("id", d => {
                return "input_" + d.Lid;
            })
            .attr("font-size", "10px").attr("text-anchor", "middle")
            .attr("dx", d => {
                if (d.source.Nx <= d.target.Nx) {
                    return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                            + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) * 3 / 4;
                }
                else {
                    return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                            + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) / 4;
                }
            }).attr("dy", "-5");
        this.lineTextInput.append("textPath")
            .attr("xlink:href", d => {
                return "#" + d.Lid;
            }).text(function (d) {
            return d.inputText ? d.inputText : "";
        });
        this.lineTextOutput = lineGroup.append("text")
            .attr("id", d => {
                return "output_" + d.Lid;
            })
            .attr("font-size", "10px").attr("text-anchor", "middle")
            .attr("dx", d => {
                if (d.source.Nx <= d.target.Nx) {
                    return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                            + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) / 4;
                }
                else {
                    return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                            + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) * 3 / 4;
                }
            }).attr("dy", "-5");
        this.lineTextOutput.append("textPath")
            .attr("xlink:href", d => {
                return "#" + d.Lid;
            }).text(function (d) {
            return d.outputText ? d.outputText : "";
        });
    }

    buildNodes() {
        d3.select("#group_icon").selectAll("g").remove();
        var iconGroup = d3.select("#group_icon").selectAll("g")
            .data(this.nodes)
            .enter()
            .append("g")
            .attr("id", d => {
                return "group_node_" + d.Svid;
            })
            .on("click", d => {
                this.hideContextMenu();
                var circle = "#circle_" + d.Svid;
                if (this.ctrlPress === true) {
                    console.log("点击时ctrl按下:true");
                    this.selectedNodes.forEach(n => {
                        console.log(n.Svid);
                    });
                    var nodeIndex = this.selectedNodes.indexOf(d);
                    if (nodeIndex > -1) {
                        console.log("点选的内容已经存在");
                        console.log("点击之前的选中节点数：" + this.selectedNodes.length);
                        d3.select(circle).attr("stroke-width", 0);
                        this.selectedNodes.splice(nodeIndex, 1);
                        console.log("点击之后的选中节点数：" + this.selectedNodes.length);
                    }
                    else {
                        console.log("点选的内容不存在");
                        console.log("点击之前的选中节点数：" + this.selectedNodes.length);
                        this.selectedNodes.push(d);
                        console.log("点击之后的选中节点数：" + this.selectedNodes.length);
                        this.selectedNodes.forEach(n => {
                            var circleId = "#circle_" + n.Svid;
                            d3.select(circleId).attr("stroke-width", 1.5);
                        })
                    }
                }
                else {
                    console.log("点击时ctrl按下:false");
                    this.selectedNodes.forEach(node => {
                        var element = "#circle_" + node.Svid;
                        d3.select(element).attr("stroke-width", 0);
                    });
                    this.selectedNodes = [];
                    d3.select(circle).attr("stroke-width", 1.5);
                    this.selectedNodes.push(d);
                }
                d3.event.stopPropagation();
                return false;
            })
            .on("contextmenu", d => {
                if (this.selectedNodes.length > 0) {
                    if (this.selectedNodes.indexOf(d) < 0) {
                        return;
                    }
                }
                console.log(d3.event);
                d3.select(".contextmenu")
                    .style("display", "block")
                    .style("left", d3.event.pageX + "px")
                    .style("top", d3.event.pageY + "px");

                d3.selectAll(".limenu").on("click", (data, index, array) => {
                    var elementId = array[index].id;
                    if (elementId === "liDelete") {
                        this.hideContextMenu();

                        if (this.selectedNodes.length === 0) {
                            this.selectedNodes.push(d);
                        }

                        var deleteNodeArray = this.selectedNodes;
                        this.deleteSelectedNodes();

                        this.buildEdges();
                        this.buildNodes();

                        if (this.onDeletedFunc) {
                            this.onDeletedFunc(deleteNodeArray);
                        }
                    }
                    if (elementId === "liCreate") {
                        var len = this.selectedNodes.length;
                        if (len < 2) {
                            this.hideContextMenu();
                            this.cancelNodeSelected();
                            alert("至少需要选中两个元素");
                            return;
                        }

                        /*  检测判断是否可以合并
                         var sourceElement = null;
                         for (var index = 0; index < len; index++) {
                         var node = this.selectedNodes[index];
                         var sourceEdge = this.edges.find(n => n.source === node);
                         if (sourceEdge) {
                         this.hideContextMenu();
                         this.cancelNodeSelected();
                         alert("所选元素不符合创建子拓扑条件(只支持同一元素的叶子节点聚合)");
                         return;
                         }
                         var edge = this.edges.find(n => n.target === node);
                         if (sourceElement === null) {
                         sourceElement = edge.source;
                         }
                         else {
                         if (edge.source !== sourceElement) {
                         this.hideContextMenu();
                         this.cancelNodeSelected();
                         alert("所选元素不符合创建子拓扑条件(只支持同一元素的叶子节点聚合)");
                         return;
                         }
                         }
                         }
                         */

                        d3.select("#liDelete").style("display", "none");
                        d3.select(".contentmenu").style("display", "block");
                        d3.select("#btn_topo_confirm").on("click", d => {
                            var topoName = document.querySelector("#txt_topo_name").value;
                            if (topoName == "") {
                                alert("子拓扑名称不能为空");
                                return;
                            }
                            this.hideContextMenu();
                            if (this.onCreatingFunc) {
                                var nodeIdArray = [];
                                var position = {x: 0, y: 0, count: 0};
                                this.selectedNodes.forEach(node => {
                                    position.count++;
                                    position.x = position.x + node.Nx;
                                    position.y = position.y + node.Ny;
                                    nodeIdArray.push(node.Svid);
                                });
                                this.onCreatingFunc(topoName, nodeIdArray, position.x, position.y);
                            }
                        });
                    }
                });
            })
            .on("dblclick", d => {
                d3.event.stopPropagation();
            })
            .call(d3.drag()
                .on("start", d => {
                    this.hideContextMenu();
                })
                .on("drag", d => {
                    this.draging(d);
                })
                .on("end", d => {
                    if (this.onDragEndFunc) {
                        var nodes = [];
                        if (this.selectedNodes.length === 0) {
                            nodes.push({
                                Svid: d.Svid,
                                Nx: d.Nx,
                                Ny: d.Ny
                            })
                        }
                        else {
                            this.selectedNodes.forEach(node => {
                                nodes.push({
                                    Svid: node.Svid,
                                    Nx: node.Nx,
                                    Ny: node.Ny
                                });
                            })
                        }
                        this.onDragEndFunc(nodes);
                    }
                }));

        iconGroup.append("circle")
            .attr("id", function (d) {
                return "circle_" + d.Svid;
            })
            .attr("cx", function (d) {
                return d.Nx;
            })
            .attr("cy", function (d) {
                return d.Ny;
            })
            .attr("r", 20)
            .attr("fill", "#ddd")
            .attr("stroke", "#F00")
            .attr("stroke-dasharray", "4,3")
            .attr("stroke-width", 0);
        iconGroup.append("image")
            .attr("id", function (d) {
                return "image_" + d.Svid;
            })
            .attr("width", 30).attr("height", 25)
            .attr("href", d => {
                return d.url ? d.url : ("icons/" + d.Svgtype + ".svg");
            })
            .attr("x", d => {
                return d.Nx - 15;
            })
            .attr("y", d => {
                return d.Ny - 12.5;
            });
        iconGroup.append("text")
            .attr("id", function (d) {
                return "text_" + d.Svid;
            })
            .attr("x", function (d) {
                return d.Nx;
            })
            .attr("y", function (d) {
                return d.Ny
            })
            .attr("dy", 22.5)
            .attr("font-size", "10px")
            .attr("text-anchor", "middle")
            .style("cursor", "default")
            .text(function (d) {
                return d.Localip;
            });
    }

    buildShape() {
        this.buildNodeEdgeRelation();
        this.buildEdges();
        this.buildNodes();
    }

    draging(d) {
        if (this.selectedNodes.indexOf(d) > -1) {
            this.selectedNodes.forEach(node => {
                this.moveNode(node);
            })
        }
        else {
            this.cancelNodeSelected();
            this.moveNode(d);
        }
    }

    getLineArrow(x1, y1, x2, y2, par, type) {
        var angle = Math.atan2((y2 - y1), (x2 - x1));
        var cos = Math.cos(angle);
        var sin = Math.sin(angle);

        if (type === "front") {
            var positionPoint = {x: x1 / 4 + x2 * 3 / 4, y: y1 / 4 + y2 * 3 / 4};
            var frontPoint = {x: positionPoint.x + cos * 2 * par, y: positionPoint.y + sin * 2 * par};
            var pathFront = "M" + frontPoint.x + "," + frontPoint.y;
            var frontLeft = {x: positionPoint.x + sin * par, y: positionPoint.y - cos * par};
            var frontRight = {x: positionPoint.x - sin * par, y: positionPoint.y + cos * par};
            var frontEnd = {x: positionPoint.x + cos * par / 2, y: positionPoint.y + sin * par / 2};
            pathFront = pathFront + "L" + frontLeft.x + "," + frontLeft.y + "L" + frontEnd.x + "," + frontEnd.y
                + "L" + frontRight.x + "," + frontRight.y + "Z";
            return pathFront;
        }
        if (type === "back") {
            var positionPoint = {x: x1 * 3 / 4 + x2 / 4, y: y1 * 3 / 4 + y2 / 4};
            var backPoint = {x: positionPoint.x - cos * 2 * par, y: positionPoint.y - sin * 2 * par};
            var pathBack = "M" + backPoint.x + "," + backPoint.y;
            var backLeft = {x: positionPoint.x + sin * par, y: positionPoint.y - cos * par};
            var backRight = {x: positionPoint.x - sin * par, y: positionPoint.y + cos * par};
            var backEnd = {x: positionPoint.x - cos * par / 2, y: positionPoint.y - sin * par / 2};
            pathBack = pathBack + "L" + backLeft.x + "," + backLeft.y + "L" + backEnd.x + "," + backEnd.y
                + "L" + backRight.x + "," + backRight.y + "Z";
            return pathBack;
        }
    }

    changeLineColor(lineId, color) {
        var edge = this.edges.find(n => n.Lid === lineId);
        if (edge) {
            edge.color = color;
            this.lines.filter(n => n.Lid === lineId)
                .attr("stroke", color);
        }
    }

    changeInputText(lineId, inputText) {
        var edge = this.edges.find(n => n.Lid === lineId);
        if (edge) {
            edge.inputText = inputText;
            this.lineTextInput.filter(n => n.Lid === lineId)
                .selectAll("textPath")
                .text(inputText);
        }
    }

    changeOutputText(lineId, outputText) {
        var edge = this.edges.find(n => n.Lid === lineId);
        if (edge) {
            edge.outputText = outputText;
            this.lineTextOutput.filter(n => n.Lid === lineId)
                .selectAll("textPath")
                .text(outputText);
        }
    }

    changeTotalText(lineId, totalText) {
        var edge = this.edges.find(n => n.Lid === lineId);
        if (edge) {
            edge.totalText = totalText;
            this.lineTextTotal.filter(n => n.Lid === lineId)
                .selectAll("textPath")
                .text(totalText);
        }
    }

    changeImageUrl(nodeId, url) {
        var node = this.nodes.find(n => n.Svid === nodeId);
        if (node) {
            node.url = url;
            d3.select("#image_" + nodeId).attr("href", url);
        }
    }

    showText(config) {
        var texts = [];
        if (config.type === "input") {
            texts.push(this.lineTextInput);
        }
        else if (config.type === "output") {
            texts.push(this.lineTextOutput);
        }
        else if (config.type === "total") {
            texts.push(this.lineTextTotal);
        }
        else {
            texts.push(this.lineTextInput);
            texts.push(this.lineTextOutput);
            texts.push(this.lineTextTotal);
        }
        var displayString = config.isShow ? "block" : "none";
        if (config.lineId) {
            texts.forEach(text =>
                text.filter(n => n.Lid === config.lineId)
                    .style("display", displayString)
            )
        }
        else {
            texts.forEach(text =>
                text.style("display", displayString)
            )
        }
    }

    getValveData(lineId) {
        var data = this.edges.find(n => n.Lid === lineId);
        if (data) {
            return {flow: data.Flow, warn: data.Warn, error: data.Error};
        }
        return null;
    }

    getNodes() {
        var nodes = this.shapeContainer.select(".node").selectAll("g");
        return nodes;
    }

    getLines() {
        var lines = this.shapeContainer.select(".edge").selectAll("g");
        return lines;
    }

    moveNode(d) {
        d.Nx = d.Nx + d3.event.dx;
        d.Ny = d.Ny + d3.event.dy;
        d3.select("#circle_" + d.Svid)
            .attr("cx", function (d) {
                return d.Nx
            })
            .attr("cy", function (d) {
                return d.Ny;
            });
        d3.select("#image_" + d.Svid)
            .attr("x", function (d) {
                return d.Nx - 15;
            })
            .attr("y", function (d) {
                return d.Ny - 12.5;
            });
        d3.select("#text_" + d.Svid)
            .attr("x", function (d) {
                return d.Nx;
            })
            .attr("y", function (d) {
                return d.Ny;
            });

        this.lines.filter(n => {
            return n.Lsource === d.Svid || n.Ltarget === d.Svid;
        }).attr("d", function (r) {
            if (r.source.Nx <= r.target.Nx) {
                return "M" + r.source.Nx + "," + r.source.Ny + "L" + r.target.Nx + "," + r.target.Ny;
            }
            else {
                return "M" + r.target.Nx + "," + r.target.Ny + "L" + r.source.Nx + "," + r.source.Ny;
            }
        });
        this.frontArrows.filter(n => {
            return n.Lsource === d.Svid || n.Ltarget === d.Svid;
        }).attr("d", r => {
            return this.getLineArrow(r.source.Nx, r.source.Ny, r.target.Nx, r.target.Ny, 4, "front");
        });
        this.backArrows.filter(n => {
            return n.Lsource === d.Svid || n.Ltarget === d.Svid;
        }).attr("d", r => {
            return this.getLineArrow(r.source.Nx, r.source.Ny, r.target.Nx, r.target.Ny, 4, "back");
        });

        this.lineTextTotal.filter(n => {
            return n.Lsource === d.Svid || n.Ltarget === d.Svid;
        }).attr("dx", function (d) {
            return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                    + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) / 2;
        });
        this.lineTextInput.filter(n => {
            return n.Lsource === d.Svid || n.Ltarget === d.Svid;
        }).attr("dx", function (d) {
            if (d.source.Nx <= d.target.Nx) {
                return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                        + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) * 3 / 4;
            }
            else {
                return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                        + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) / 4;
            }
        });
        this.lineTextOutput.filter(n => {
            return n.Lsource === d.Svid || n.Ltarget === d.Svid;
        }).attr("dx", function (d) {
            if (d.source.Nx <= d.target.Nx) {
                return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                        + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) / 4;
            }
            else {
                return Math.sqrt((d.target.Nx - d.source.Nx) * (d.target.Nx - d.source.Nx)
                        + (d.target.Ny - d.source.Ny) * (d.target.Ny - d.source.Ny)) * 3 / 4;
            }
        });
    }

    cancelNodeSelected() {
        this.selectedNodes.forEach(node => {
            var circle = "#circle_" + node.Svid;
            d3.select(circle).attr("stroke-width", 0);
        });
        this.selectedNodes = [];
    }

    hideContextMenu() {
       /* document.querySelector("#txt_topo_name").value = "";
        d3.select(".contentmenu").style("display", "none");*/
        d3.selectAll(".limenu").style("display", "block");
        d3.select(".contextmenu").style("display", "none");
    }

    onDragEnd(func) {
        this.onDragEndFunc = func;
    }

    onDeleted(func) {
        this.onDeletedFunc = func;
    }

    onCreating(func) {
        this.onCreatingFunc = func;
    }

    deleteSelectedNodes() {
        this.selectedNodes.forEach(node => {
            for (var index = this.edges.length - 1; index >= 0; index--) {
                var edge = this.edges[index];
                if (edge.source === node || edge.target === node) {
                    this.edges.splice(index, 1);
                }
            }
            var index = this.nodes.indexOf(node);
            this.nodes.splice(index, 1);
        });
        this.cancelNodeSelected();
    }

    appendNode(node) {
        this.nodes.push(node);
    }

    appendEdge(edge) {
        this.edges.push(edge);
    }

    getNodeById(nodeId) {
        var node = this.nodes.find(n => n.Svid === nodeId);
        return node;
    }

    setBrushState(isBrushState) {
        var display = isBrushState === true ? "block" : "none";
        this.brush.style("display", display);
    }
}