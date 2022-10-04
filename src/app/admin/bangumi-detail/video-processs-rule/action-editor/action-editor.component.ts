import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Edge, Node } from '@swimlane/ngx-graph';
import { Action } from '../../../../entity/action';
import { ActionType } from '../../../../entity/action-type';
import { ConvertAction } from '../../../../entity/ConvertAction';
import { ExtractAction } from '../../../../entity/ExtractAction';
import { ProfileType } from '../../../../entity/ProfileType';
import { ExtractSource } from '../../../../entity/ExtractSource';
import { ExtractTarget } from '../../../../entity/ExtractTarget';
import { ActionMap } from '../../../../entity/action-map';

@Component({
    selector: 'action-editor',
    templateUrl: './action-editor.html',
    styleUrls: ['./action-editor.less']
})
export class ActionEditorComponent implements OnInit, OnDestroy {

    eActionType = ActionType;
    eProfileType = ProfileType;
    eExtractSource = ExtractSource;
    eExtractTarget = ExtractTarget;

    nodes: Node[];
    edges: Edge[];

    @Input()
    actions: ActionMap;

    selectedActionId: string;
    selectedNodeIndex: number = -1;

    ngOnDestroy(): void {
    }

    ngOnInit(): void {
        if (this.actions) {
            this.edges = [];
            this.nodes = Object.keys(this.actions).map(actionId => {
                const action = this.actions[actionId];
                if (action.upstreamActionIds && action.upstreamActionIds.length) {
                    for (const sourceId of action.upstreamActionIds)
                        this.edges.push({
                            source: sourceId,
                            target: action.id,
                            label: ''
                        });
                }
                return ActionEditorComponent.ActionToNode(action);
            });
        } else {
            this.actions = {};
            this.nodes = [];
            this.edges = [];
        }
    }

    selectNode(nodeId: string): void {
        this.unselectNode();
        this.selectedNodeIndex = this.nodes.findIndex((node) => node.id === nodeId);
        this.selectedActionId = nodeId;
        const node = this.nodes[this.selectedNodeIndex];
        if (!node.meta) {
            node.meta = {};
        }
        node.meta.selected = true;
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
        this.nodes = this.nodes.concat([ActionEditorComponent.ActionToNode(action)]);
        this.selectedActionId = action.id;
        this.selectedNodeIndex = this.nodes.length - 1;
    }

    removeSelectedNode(): void {
        if (this.selectedNodeIndex === -1 || !this.selectedActionId) {
            return;
        }
        delete this.actions[this.selectedActionId];
        this.nodes.splice(this.selectedNodeIndex, 1);
        this.selectedNodeIndex = -1;
        this.selectedActionId = null;
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

    addLink(): void {

    }

    private unselectNode(): void {
        if (this.selectedNodeIndex !== -1) {
            const node = this.nodes[this.selectedNodeIndex];
            if (!node.meta) {
                node.meta = {};
            }
            node.meta.selected = false;
        }
    }

    updateNode(): void {
        this.nodes[this.selectedNodeIndex].data = this.actions[this.selectedActionId];
        this.refreshNodes();
    }

    private refreshNodes(): void {
        this.nodes = Array.from(this.nodes);
    }

    static ActionToNode(action: Action): Node {
        return {
            id: action.id,
            label: `${action.type} #${action.id}`,
            data: action
        } as Node;
    }

}
