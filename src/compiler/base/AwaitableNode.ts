import * as ts from "typescript";
import {Constructor} from "./../../Constructor";
import * as errors from "./../../errors";
import {AwaitableNodeStructure} from "./../../structures";
import {callBaseFill} from "./../callBaseFill";
import {insertIntoParent, removeChildren, FormattingKind} from "./../../manipulation";
import {Node} from "./../common";
import {NamedNode} from "./../base";

export type AwaitableNodeExtensionType = Node<ts.Node & { awaitModifier?: ts.AwaitKeywordToken; }>;

export interface AwaitableNode {
    /**
     * If it's an awaited node.
     */
    isAwaited(): boolean;
    /**
     * Gets the await token or undefined if none exists.
     */
    getAwaitKeyword(): Node<ts.AwaitKeywordToken> | undefined;
    /**
     * Gets the await token or throws if none exists.
     */
    getAwaitKeywordOrThrow(): Node<ts.AwaitKeywordToken>;
    /**
     * Sets if the node is awaited.
     * @param value - If it should be awaited or not.
     */
    setIsAwaited(value: boolean): this;
}

export function AwaitableNode<T extends Constructor<AwaitableNodeExtensionType>>(Base: T): Constructor<AwaitableNode> & T {
    return class extends Base implements AwaitableNode {
        isAwaited() {
            return this.compilerNode.awaitModifier != null;
        }

        getAwaitKeyword(): Node<ts.AwaitKeywordToken> | undefined {
            const awaitModifier = this.compilerNode.awaitModifier;
            return awaitModifier == null ? undefined : (this.getNodeFromCompilerNode(awaitModifier) as Node<ts.AwaitKeywordToken>);
        }

        getAwaitKeywordOrThrow(): Node<ts.AwaitKeywordToken> {
            return errors.throwIfNullOrUndefined(this.getAwaitKeyword(), "Expected to find an await token.");
        }

        setIsAwaited(value: boolean) {
            const awaitModifier = this.getAwaitKeyword();
            const isSet = awaitModifier != null;

            if (isSet === value)
                return this;

            if (awaitModifier == null) {
                const info = getAwaitInsertInfo(this);
                insertIntoParent({
                    insertPos: info.pos,
                    childIndex: info.childIndex,
                    insertItemsCount: 1,
                    parent: this,
                    newText: " await"
                });
            }
            else {
                removeChildren({
                    children: [awaitModifier],
                    removePrecedingSpaces: true
                });
            }

            return this;
        }

        fill(structure: Partial<AwaitableNodeStructure>) {
            callBaseFill(Base.prototype, this, structure);

            if (structure.isAwaited != null)
                this.setIsAwaited(structure.isAwaited);

            return this;
        }
    };
}

function getAwaitInsertInfo(node: Node) {
    if (node.getKind() === ts.SyntaxKind.ForOfStatement) {
        const forKeyword = node.getFirstChildByKindOrThrow(ts.SyntaxKind.ForKeyword);
        return {
            pos: forKeyword.getEnd(),
            childIndex: forKeyword.getChildIndex() + 1
        };
    }

    throw new errors.NotImplementedError("Expected a for of statement node.");
}
