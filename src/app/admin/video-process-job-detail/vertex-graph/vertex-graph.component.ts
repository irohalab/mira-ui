import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Edge, Node } from '@swimlane/ngx-graph';
import { ActionType } from '../../../entity/action-type';
import { ProfileType } from '../../../entity/ProfileType';
import { ExtractSource } from '../../../entity/ExtractSource';
import { ExtractTarget } from '../../../entity/ExtractTarget';
import { getRemPixel } from '../../../../helpers/dom';
import { Vertex } from '../../../entity/Vertex';

const GRAPH_HEIGHT = getRemPixel(30);

@Component({
    selector: 'vertex-graph',
    templateUrl: './vertex-graph.html',
    styleUrls: ['./vertex-graph.less']
})
export class VertexGraphComponent implements AfterViewInit, OnInit {
    readonly eActionType = ActionType;
    readonly eProfileType = ProfileType;
    readonly eExtractSource = ExtractSource;
    readonly eExtractTarget = ExtractTarget;
    private _timerOfDimensionDetect: number;

    graphViewDimension: [number, number];

    nodes: Node[];
    edges: Edge[];

    @Input()
    vertices: Vertex[];

    readonly nodeHeightDict: {[key: string]: number} = {
        [ActionType.Convert]: 80,
        [ActionType.Extract]: 120
    }

    readonly nodeIconClassDict: {[key: string]: string} = {
        [ActionType.Convert]: 'cogs',
        [ActionType.Extract]: 'envelope outline open'
    }

    @ViewChild('graphContainer') vertexGraphContainer: ElementRef;

    ngOnInit(): void {
        if (this.vertices) {
            this.edges = [];
            this.nodes = this.vertices.map(vertex => {
                const node = {
                    id: vertex.id,
                    label: `${vertex.actionType} #${vertex.id.substring(0, 4)}`,
                    data: vertex
                } as Node;
                if (vertex.upstreamVertexIds && vertex.upstreamVertexIds.length > 0) {
                    for(const vxId of vertex.upstreamVertexIds) {
                        this.edges.push({
                            source: vxId,
                            target: vertex.id
                        } as Edge);
                    }
                }
                return node;
            });
        }
    }

    ngAfterViewInit(): void {
        this.detectDimension();
    }

    unselectAnything(): void {

    }

    selectNode(nodeId: string, event: Event, nodeMeta: any): void {
        event.preventDefault();
        event.stopPropagation();
    }

    private detectDimension(): void {
        this._timerOfDimensionDetect = window.setTimeout(() => {
            const containerEl = this.vertexGraphContainer.nativeElement as HTMLElement;
            let {width} = containerEl.getBoundingClientRect();
            if (width) {
                this.graphViewDimension = [width, GRAPH_HEIGHT];
            } else {
                this.detectDimension();
            }
        }, 100);
    }
}
