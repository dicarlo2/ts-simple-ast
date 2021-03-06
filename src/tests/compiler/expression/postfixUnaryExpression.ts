import * as ts from "typescript";
import {expect} from "chai";
import {PostfixUnaryExpression} from "./../../../compiler";
import {getInfoFromTextWithDescendant} from "./../testHelpers";

describe(nameof(PostfixUnaryExpression), () => {
    const expression = "x";
    const expr = `${expression}++`;
    const {descendant: postfixUnaryExpression} = getInfoFromTextWithDescendant<PostfixUnaryExpression>(expr, ts.SyntaxKind.PostfixUnaryExpression);

    describe(nameof<PostfixUnaryExpression>(n => n.getOperand), () => {
        it("should get the correct expression", () => {
            expect(postfixUnaryExpression.getOperand()!.getText()).to.equal(expression);
        });
    });

    describe(nameof<PostfixUnaryExpression>(n => n.getOperatorToken), () => {
        it("should return the operator token", () => {
            expect(postfixUnaryExpression.getOperatorToken()).to.equal(ts.SyntaxKind.PlusPlusToken);
        });
    });
});
