﻿import * as ts from "typescript";
import {ConstructSignatureDeclarationStructure} from "./../../structures";
import {removeInterfaceMember} from "./../../manipulation";
import {callBaseFill} from "./../callBaseFill";
import {Node} from "./../common";
import {JSDocableNode, ChildOrderableNode} from "./../base";
import {SignaturedDeclaration} from "./../function";

export const ConstructSignatureDeclarationBase = ChildOrderableNode(JSDocableNode(SignaturedDeclaration(Node)));
export class ConstructSignatureDeclaration extends ConstructSignatureDeclarationBase<ts.ConstructSignatureDeclaration> {
    /**
     * Fills the node from a structure.
     * @param structure - Structure to fill.
     */
    fill(structure: Partial<ConstructSignatureDeclarationStructure>) {
        callBaseFill(ConstructSignatureDeclarationBase.prototype, this, structure);

        return this;
    }

    /**
     * Removes this construct signature.
     */
    remove() {
        removeInterfaceMember(this);
    }
}
