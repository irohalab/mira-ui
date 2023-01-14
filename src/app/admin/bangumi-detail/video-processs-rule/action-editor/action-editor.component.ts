import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Edge, Node } from '@swimlane/ngx-graph';
import { Action } from '../../../../entity/action';
import { ActionType } from '../../../../entity/action-type';
import { ConvertAction } from '../../../../entity/ConvertAction';
import { ExtractAction } from '../../../../entity/ExtractAction';
import { ProfileType } from '../../../../entity/ProfileType';
import { ExtractSource } from '../../../../entity/ExtractSource';
import { ExtractTarget } from '../../../../entity/ExtractTarget';
import { ActionMap } from '../../../../entity/action-map';
import { getRemPixel } from '../../../../../helpers/dom';
import { isCyclicGraph } from './action-graph-utils';

enum LinkMode {
    LinkUpstream = 'LinkUpstream',
    LinkDownstream = 'LinkDownstream',
    None = 'None'
}

const NODE_EDITOR_WIDTH = 20; //unit rem;

@Component({
    selector: 'action-editor',
    templateUrl: './action-editor.html',
    styleUrls: ['./action-editor.less']
})
export class ActionEditorComponent implements OnInit, AfterViewInit {

    readonly eActionType = ActionType;
    readonly eProfileType = ProfileType;
    readonly eExtractSource = ExtractSource;
    readonly eExtractTarget = ExtractTarget;
    readonly eLinkMode = LinkMode;

    graphViewDimension: [number, number];

    nodes: Node[];
    edges: Edge[];

    @Input()
    actions: ActionMap;

    @Input()
    editMode = false;

    allowZoom = false;

    selectedActionId: string;
    selectedNodeIndex: number = -1;
    selectedLinkId: string;
    selectedLinkIndex: number = -1;

    readonly nodeHeightDict: {[key: string]: number} = {
        [ActionType.Convert]: 80,
        [ActionType.Extract]: 120
    }

    readonly nodeIconClassDict: {[key: string]: string} = {
        [ActionType.Convert]: 'cogs',
        [ActionType.Extract]: 'envelope outline open'
    }

    readonly extractorIdList: string[] = ['Default', 'File', 'Subtitle', 'Audio'];

    linkMode = LinkMode.None;

    @ViewChild('actionEditorContainer') actionEditorContainer: ElementRef;

    private _timerOfDimensionDetect: number;

    ngAfterViewInit(): void {
        this.detectDimension();
    }

    ngOnInit(): void {
        if (this.editMode) {
            this.allowZoom = true;
        }
        if (this.actions) {
            this.edges = [];
            this.nodes = Object.keys(this.actions).map(actionId => {
                const action = this.actions[actionId];
                if (action.upstreamActionIds && action.upstreamActionIds.length > 0) {
                    for (const sourceId of action.upstreamActionIds)
                        this.edges.push({
                            source: sourceId,
                            target: action.id,
                        });
                }
                return this.actionToNode(action);
            });
        } else {
            this.actions = {};
            this.nodes = [];
            this.edges = [];
        }
    }

    selectNode(nodeId: string, event?: Event, nodeMeta?: any): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!this.editMode) {
            return;
        }
        if (this.linkMode !== LinkMode.None) {
            if (nodeId === this.selectedActionId || (nodeMeta && nodeMeta.disabled)) {
                return;
            }
            // link mode code
            if (this.hasCycle(nodeId)) {
                return;
            }
            this.addLink(nodeId);
            this.linkMode = LinkMode.None;
            this.updateNodeMeta();
            this.refreshEdges();
            return;
        }
        this.selectedNodeIndex = this.nodes.findIndex((node) => node.id === nodeId);
        this.selectedActionId = nodeId;
        const node = this.nodes[this.selectedNodeIndex];
        const action = this.actions[nodeId];
        node.meta = node.meta || {};
        node.meta.allowInput = action.upstreamActionIds.length < this.getMaxUpstreamByActionType(action.type);
        node.meta.allowOutput = action.downstreamIds.length < 1; // currently only 1 output per action is allowed;
    }

    selectLink(event: Event, linkId: string): void {
        event.preventDefault();
        event.stopPropagation();
        if (!this.editMode) {
            return;
        }
        this.selectedLinkId = linkId;
        for(let i = 0; i < this.edges.length; i++) {
            if (this.edges[i].id === linkId) {
                this.selectedLinkIndex = i;
                return;
            }
        }
        this.selectedLinkIndex = -1;
    }

    unselectAnything(): void {
        if (!this.editMode) {
            return;
        }
        this.selectedActionId = null;
        this.selectedNodeIndex = -1;
        this.selectedLinkIndex = -1;
        this.selectedLinkId = null;
        this.linkMode = LinkMode.None;
        this.updateNodeMeta();
    }

    addNode(actionType: string): void {
        let action: Action;
        switch (actionType) {
            case ActionType.Convert:
                action = new ConvertAction();
                break;
            case ActionType.Extract:
                action = new ExtractAction();
                break;
            // no default
        }
        this.actions[action.id] = action;
        this.nodes = this.nodes.concat([this.actionToNode(action)]);
        this.selectNode(action.id)
    }

    removeSelectedNode(): void {
        if (this.selectedNodeIndex === -1 || !this.selectedActionId) {
            return;
        }
        const action = this.actions[this.selectedActionId];
        if (action.upstreamActionIds.length > 0) {
            for (const actId of action.upstreamActionIds) {
                const upstreamAction = this.actions[actId];
                const idx = upstreamAction.downstreamIds.indexOf(this.selectedActionId);
                if (idx !== -1) {
                    upstreamAction.downstreamIds.splice(idx, 1);
                }
                this.removeEdge(upstreamAction.id, this.selectedActionId);
            }
        } else if (action.downstreamIds.length > 0) {
            for (const actId of action.downstreamIds) {
                const downstreamAction = this.actions[actId];
                const idx = downstreamAction.upstreamActionIds.indexOf(this.selectedActionId);
                if (idx !== -1) {
                    downstreamAction.upstreamActionIds.splice(idx, 1);
                }
                this.removeEdge(this.selectedActionId, downstreamAction.id);
            }
        }
        if (action.upstreamActionIds.length > 0 || action.downstreamIds.length > 0) {
            this.refreshEdges();
        }
        delete this.actions[this.selectedActionId];
        this.nodes.splice(this.selectedNodeIndex, 1);
        this.selectedNodeIndex = -1;
        this.selectedActionId = null;
        this.refreshNodes();
    }

    removeLink(): void {
        if (!this.selectedLinkId || this.selectedLinkIndex === -1 || this.selectedLinkIndex >= this.edges.length) {
            return;
        }
        const link = this.edges[this.selectedLinkIndex];
        const upstreamAction = this.actions[link.source];
        const downstreamAction = this.actions[link.target];
        if (upstreamAction && downstreamAction) {
            for (let i = 0; i < upstreamAction.downstreamIds.length; i++) {
                if (upstreamAction.downstreamIds[i] === link.target) {
                    upstreamAction.downstreamIds.splice(i, 1);
                    break;
                }
            }
            for (let i = 0; i < downstreamAction.upstreamActionIds.length; i++) {
                if (downstreamAction.upstreamActionIds[i] === link.source) {
                    downstreamAction.upstreamActionIds.splice(i , 1);
                    break;
                }
            }
            this.edges.splice(this.selectedLinkIndex, 1);
            this.selectedLinkId = null;
            this.selectedLinkIndex = -1;
            this.refreshEdges();
            this.updateNodeMeta();
        }
    }

    updateActionExtractorId(extractorId: string): void {
        (this.actions[this.selectedActionId] as ExtractAction).extractorId = extractorId;
        this.updateNode();
    }

    updateActionProfile(profile: string): void {
        (this.actions[this.selectedActionId] as ConvertAction).profile = profile;
        this.updateNode();
    }

    updateActionExtractSource(source: string): void {
        (this.actions[this.selectedActionId] as ExtractAction).extractFrom = source as ExtractSource;
        this.updateNode();
    }

    updateActionExtractTarget(target: string): void {
        (this.actions[this.selectedActionId] as ExtractAction).extractTarget = target as ExtractTarget;
        this.updateNode();
    }

    /**
     * Enter link mode to select an action as current selected action's upstream
     */
    addUpstreamAction(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (this.linkMode !== LinkMode.None) {
            return;
        }
        this.linkMode = LinkMode.LinkUpstream;
        this.updateNodeMeta();
    }

    /**
     * Enter link mode to select an action as current selected action's downstream
     */
    addDownstreamAction(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        if (this.linkMode !== LinkMode.None) {
            return;
        }
        this.linkMode = LinkMode.LinkDownstream;
        this.updateNodeMeta();
    }

    private addLink(actionId: string): void {
        let upstreamActionId: string;
        let downstreamActionId: string;
        if (this.linkMode === LinkMode.LinkUpstream) {
            upstreamActionId = actionId;
            downstreamActionId = this.selectedActionId;
        } else if (this.linkMode === LinkMode.LinkDownstream) {
            upstreamActionId = this.selectedActionId;
            downstreamActionId = actionId;
        } else {
            throw new Error('addLink only works for linMode is not None');
        }
        this.actions[downstreamActionId].upstreamActionIds.push(upstreamActionId);
        this.actions[upstreamActionId].downstreamIds.push(downstreamActionId);
        this.edges.push({
            source: upstreamActionId,
            target: downstreamActionId
        } as Edge);
        this.updateNodeMeta();
    }

    /**
     * Detect a cycle in directed graph after an action is linked.
     * @param actionId action id to link
     * @private
     */
    private hasCycle(actionId: string): boolean {
        // here we are just lazy to use JSON for deep copy because ActionMap and Action are both simple objects.
        const tempActionMap: ActionMap = JSON.parse(JSON.stringify(this.actions));
        let upstreamAction: Action;
        let downstreamAction: Action;
        if (this.linkMode === LinkMode.LinkDownstream) {
            upstreamAction = tempActionMap[this.selectedActionId];
            downstreamAction = tempActionMap[actionId];
        } else if (this.linkMode === LinkMode.LinkUpstream) {
            downstreamAction = tempActionMap[this.selectedActionId];
            upstreamAction = tempActionMap[actionId];
        } else {
            throw new Error('hasCycle function only work for linkMode is not None');
        }
        upstreamAction.downstreamIds.push(downstreamAction.id);
        downstreamAction.upstreamActionIds.push(upstreamAction.id);
        return isCyclicGraph(tempActionMap);
    }

    updateNode(): void {
        this.nodes[this.selectedNodeIndex].data = this.actions[this.selectedActionId];
        this.refreshNodes();
    }

    private updateNodeMeta(): void {
        this.nodes.forEach((node: Node) => {
            if (!node.meta) {
                node.meta = {};
            }
            node.meta.allowInput = node.data.upstreamActionIds.length < this.getMaxUpstreamByActionType(node.data.type);
            node.meta.allowOutput = node.data.downstreamIds.length < 1;
            if (this.linkMode === LinkMode.None) {
                node.meta.disabled = false;
            } else if (node.id === this.selectedActionId) {
                node.meta.disabled = true;
            } else if (this.linkMode === LinkMode.LinkDownstream) {
                node.meta.disabled = !node.meta.allowInput;
            } else if (this.linkMode === LinkMode.LinkUpstream) {
                node.meta.disabled = !node.meta.allowOutput;
            } else {
                node.meta.disabled = false;
            }
        });
    }

    private refreshNodes(): void {
        this.nodes = Array.from(this.nodes);
    }

    private refreshEdges(): void {
        this.edges = Array.from(this.edges);
    }

    private actionToNode(action: Action): Node {
        return {
            id: action.id,
            label: `${action.type} #${action.id}`,
            data: action
        } as Node;
    }

    private getMaxUpstreamByActionType(actionType: ActionType): number {
        switch (actionType) {
            case ActionType.Convert:
                return Number.MAX_VALUE;
            case ActionType.Extract:
                return 0;
            default:
                throw new Error('Unsupported action type');
        }
    }

    private detectDimension(): void {
        this._timerOfDimensionDetect = window.setTimeout(() => {
            const containerEl = this.actionEditorContainer.nativeElement as HTMLElement;
            let {width, height} = containerEl.getBoundingClientRect();
            const nodeEditorWidth = this.editMode ? getRemPixel(NODE_EDITOR_WIDTH) : 0;
            width = width - nodeEditorWidth;
            if (width < 0) {
                width = containerEl.clientWidth;
            }
            if (width && height) {
                this.graphViewDimension = [width, height];
            } else {
                this.detectDimension();
            }
        }, 100);
    }

    private removeEdge(sourceId: string, targetId: string): void {
        for(let i = 0; i < this.edges.length; i++) {
            if (this.edges[i].source === sourceId && this.edges[i].target === targetId) {
                this.edges.splice(i, 1);
                break;
            }
        }
    }
}
