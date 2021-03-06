﻿import * as ts from "typescript";
import {Node, OverloadableNode, ClassDeclaration} from "./../../compiler";
import {FormattingKind, getClausedNodeChildFormatting, getClassMemberFormatting, getInterfaceMemberFormatting, getStatementedNodeChildFormatting} from "./../formatting";
import {doManipulation} from "./doManipulation";
import {RemoveChildrenTextManipulator, RemoveChildrenWithFormattingTextManipulator, UnwrapTextManipulator} from "./../textManipulators";
import {NodeHandlerFactory} from "./../nodeHandlers";

export interface RemoveChildrenOptions {
    children: Node[];
    removePrecedingSpaces?: boolean;
    removeFollowingSpaces?: boolean;
    removePrecedingNewLines?: boolean;
    removeFollowingNewLines?: boolean;
}

export function removeChildren(opts: RemoveChildrenOptions) {
    const {children} = opts;
    if (children.length === 0)
        return;

    doManipulation(children[0].getSourceFile(),
        new RemoveChildrenTextManipulator(opts),
        new NodeHandlerFactory().getForChildIndex({
            parent: children[0].getParentSyntaxList() || children[0].getParentOrThrow(),
            childIndex: children[0].getChildIndex(),
            childCount: -1 * children.length
        }));
}

export interface RemoveChildrenWithFormattingOptions<TNode extends Node> {
    children: Node[];
    getSiblingFormatting: (parent: TNode, sibling: Node) => FormattingKind;
}

export function removeChildrenWithFormattingFromCollapsibleSyntaxList<TNode extends Node>(opts: RemoveChildrenWithFormattingOptions<TNode>) {
    const {children} = opts;
    if (children.length === 0)
        return;

    const syntaxList = children[0].getParentSyntaxListOrThrow();
    if (syntaxList.getChildCount() === children.length) {
        removeChildrenWithFormatting({
            children: [syntaxList],
            getSiblingFormatting: () => FormattingKind.None
        });
    }
    else
        removeChildrenWithFormatting(opts);
}

export function removeChildrenWithFormatting<TNode extends Node>(opts: RemoveChildrenWithFormattingOptions<TNode>) {
    const {children, getSiblingFormatting} = opts;
    if (children.length === 0)
        return;

    doManipulation(children[0].sourceFile, new RemoveChildrenWithFormattingTextManipulator<TNode>({
        children,
        getSiblingFormatting
    }), new NodeHandlerFactory().getForChildIndex({
        parent: children[0].getParentSyntaxList() || children[0].getParentOrThrow(),
        childIndex: children[0].getChildIndex(),
        childCount: -1 * children.length
    }));
}

export function removeOverloadableClassMember(classMember: Node & OverloadableNode) {
    if (classMember.isOverload()) {
        if ((classMember.getParentOrThrow() as ClassDeclaration).isAmbient())
            removeClassMember(classMember);
        else
            removeChildren({ children: [classMember], removeFollowingSpaces: true, removeFollowingNewLines: true });
    }
    else
        removeClassMembers([...classMember.getOverloads(), classMember]);
}

export function removeClassMember(classMember: Node) {
    removeClassMembers([classMember]);
}

export function removeClassMembers(classMembers: Node[]) {
    removeChildrenWithFormatting({
        getSiblingFormatting: getClassMemberFormatting,
        children: classMembers
    });
}

export function removeInterfaceMember(classMember: Node) {
    removeInterfaceMembers([classMember]);
}

export function removeInterfaceMembers(classMembers: Node[]) {
    removeChildrenWithFormatting({
        getSiblingFormatting: getInterfaceMemberFormatting,
        children: classMembers
    });
}

export interface RemoveCommaSeparatedChildOptions {
    removePrecedingSpaces?: boolean;
}

export function removeCommaSeparatedChild(child: Node, opts?: RemoveCommaSeparatedChildOptions) {
    const {removePrecedingSpaces = undefined} = opts || {};
    const childrenToRemove: Node[] = [child];
    const syntaxList = child.getParentSyntaxListOrThrow();

    addNextCommaIfAble();
    addPreviousCommaIfAble();

    removeChildren({
        children: childrenToRemove,
        removePrecedingSpaces: removePrecedingSpaces == null ? true : removePrecedingSpaces,
        removeFollowingSpaces: childrenToRemove[0] === syntaxList.getFirstChild()
    });

    function addNextCommaIfAble() {
        const commaToken = child.getNextSiblingIfKind(ts.SyntaxKind.CommaToken);

        if (commaToken != null)
            childrenToRemove.push(commaToken);
    }

    function addPreviousCommaIfAble() {
        if (syntaxList.getLastChild() !== childrenToRemove[childrenToRemove.length - 1])
            return;

        const precedingComma = child.getPreviousSiblingIfKind(ts.SyntaxKind.CommaToken);
        if (precedingComma != null)
            childrenToRemove.unshift(precedingComma);
    }
}

export function removeOverloadableStatementedNodeChild(node: Node & OverloadableNode) {
    if (node.isOverload())
        removeChildren({ children: [node], removeFollowingSpaces: true, removeFollowingNewLines: true });
    else
        removeStatementedNodeChildren([...node.getOverloads(), node]);
}

export function removeStatementedNodeChild(node: Node) {
    removeStatementedNodeChildren([node]);
}

export function removeStatementedNodeChildren(nodes: Node[]) {
    removeChildrenWithFormatting({
        getSiblingFormatting: getStatementedNodeChildFormatting,
        children: nodes
    });
}

export function removeClausedNodeChild(node: Node) {
    removeClausedNodeChildren([node]);
}

export function removeClausedNodeChildren(nodes: Node[]) {
    removeChildrenWithFormatting({
        getSiblingFormatting: getClausedNodeChildFormatting,
        children: nodes
    });
}

export function unwrapNode(node: Node) {
    doManipulation(node.sourceFile,
        new UnwrapTextManipulator(node),
        new NodeHandlerFactory().getForUnwrappingNode(node));
}
