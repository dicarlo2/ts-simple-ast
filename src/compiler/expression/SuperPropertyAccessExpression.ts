import * as ts from "typescript";
import {Expression} from "./Expression";
import {SuperExpressionedNode} from "./expressioned";
import {PropertyAccessExpression} from "./PropertyAccessExpression";

export const SuperPropertyAccessExpressionBase = SuperExpressionedNode(PropertyAccessExpression);
export class SuperPropertyAccessExpression extends SuperPropertyAccessExpressionBase<ts.SuperPropertyAccessExpression> {
}
