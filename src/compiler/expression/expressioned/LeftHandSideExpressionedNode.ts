import * as ts from "typescript";
import {Constructor} from "./../../../Constructor";
import {LeftHandSideExpression} from "../LeftHandSideExpression";
import {Node} from "./../../common";

export type LeftHandSideExpressionedNodeExtensionType = Node<ts.Node & {expression: ts.LeftHandSideExpression}>;

export interface LeftHandSideExpressionedNode {
    /**
     * Gets the expression.
     */
    getExpression(): LeftHandSideExpression;
}

export function LeftHandSideExpressionedNode<T extends Constructor<LeftHandSideExpressionedNodeExtensionType>>(Base: T): Constructor<LeftHandSideExpressionedNode> & T {
    return class extends Base implements LeftHandSideExpressionedNode {
        getExpression() {
            return this.getNodeFromCompilerNode(this.compilerNode.expression) as LeftHandSideExpression;
        }
    };
}
