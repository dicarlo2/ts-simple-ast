﻿import * as ts from "typescript";
import {expect} from "chai";
import {SourceFile} from "./../../compiler";
import * as errors from "./../../errors";
import {TsSimpleAst} from "./../../TsSimpleAst";
import {SourceFileStructure} from "./../../structures";
import {Directory, DirectoryEmitResult, FileSystemHost} from "./../../fileSystem";
import {FileUtils} from "./../../utils";
import {getFileSystemHostWithFiles, CustomFileSystemProps} from "./../testHelpers";

describe(nameof(Directory), () => {
    interface TreeNode {
        directory: Directory;
        sourceFiles?: SourceFile[];
        children?: TreeNode[];
    }

    function getAst(initialFiles: { filePath: string; text: string; }[] = [], initialDirectories: string[] = []) {
        const ast = new TsSimpleAst(undefined, getFileSystemHostWithFiles(initialFiles, initialDirectories));
        return ast;
    }

    function testDirectoryTree(dir: Directory, tree: TreeNode, parent?: Directory) {
        expect(getDirPath(dir)).to.equal(getDirPath(tree.directory), "dir");
        expect(getDirPath(dir.getParent())).to.equal(getDirPath(parent), `parent dir of ${getDirPath(dir)}`);
        expect(dir.getDirectories().map(d => d.getPath())).to.deep.equal((tree.children || []).map(c => c.directory.getPath()), "child directories");
        expect(dir.getSourceFiles().map(s => s.getFilePath())).to.deep.equal((tree.sourceFiles || []).map(s => s.getFilePath()), "source files");
        for (const child of (tree.children || []))
            testDirectoryTree(child.directory, child, dir);

        function getDirPath(directory: Directory | undefined) {
            return directory == null ? undefined : directory.getPath();
        }
    }

    describe(nameof<Directory>(d => d.getPath), () => {
        function doTest(filePath: string, expectedDirPath: string) {
            const ast = getAst();
            const sourceFile = ast.createSourceFile(filePath);
            const directory = sourceFile.getDirectory();
            expect(directory.getPath()).to.equal(expectedDirPath);
        }

        it("should get the directory path when just creating a file with no directory", () => {
            doTest("test/file.ts", "/test");
        });

        it("should get the directory path in the root directory", () => {
            doTest("/file.ts", "/");
        });
    });

    describe("ancestor/descendant tests", () => {
        const ast = getAst();
        const root = ast.createDirectory("");
        const child = ast.createDirectory("child");
        const childChild = ast.createDirectory("child/child");
        const otherChild = ast.createDirectory("otherChild");
        const rootSourceFile = ast.createSourceFile("file.ts");

        describe(nameof<Directory>(d => d.isAncestorOf), () => {
            function doTest(ancestor: Directory, descendant: Directory | SourceFile, expectedValue: boolean) {
                expect(ancestor.isAncestorOf(descendant)).to.equal(expectedValue);
            }

            it("should be an ancestor when is parent", () => {
                doTest(root, child, true);
            });

            it("should be an ancestor when is ancestor", () => {
                doTest(root, childChild, true);
            });

            it("should not be when a sibling", () => {
                doTest(child, otherChild, false);
            });

            it("should not be when a child", () => {
                doTest(child, root, false);
            });

            it("should be when a parent dir of a source file", () => {
                doTest(root, rootSourceFile, true);
            });
        });

        describe(nameof<Directory>(d => d.isDescendantOf), () => {
            function doTest(descendant: Directory, ancestor: Directory, expectedValue: boolean) {
                expect(descendant.isDescendantOf(ancestor)).to.equal(expectedValue);
            }

            it("should be a descendant when is child", () => {
                doTest(child, root, true);
            });

            it("should be a descendant when is descendant", () => {
                doTest(childChild, root, true);
            });

            it("should not be when a sibling", () => {
                doTest(otherChild, child, false);
            });

            it("should not be when a parent", () => {
                doTest(root, child, false);
            });
        });
    });

    describe("getting parent, child directories, and source files in directory", () => {
        it("should not have a parent if no parent exists", () => {
            const ast = getAst();
            const sourceFile = ast.createSourceFile("directory/file.ts");
            expect(sourceFile.getDirectory().getParent()).to.be.undefined;
        });

        it("should get the files in the alphabetical order", () => {
            const ast = getAst();
            const directory = ast.createDirectory("");
            directory.createSourceFile("D.ts");
            directory.createSourceFile("b.ts");
            directory.createSourceFile("a.ts");
            directory.createSourceFile("C.ts");
            expect(directory.getSourceFiles().map(s => s.getBaseName())).to.deep.equal(["a.ts", "b.ts", "C.ts", "D.ts"]);
        });

        it("should get the directories in alphabetical order", () => {
            const ast = getAst();
            const directory = ast.createDirectory("");
            directory.createDirectory("D");
            directory.createDirectory("b");
            directory.createDirectory("a");
            directory.createDirectory("C");
            expect(directory.getDirectories().map(s => s.getBaseName())).to.deep.equal(["a", "b", "C", "D"]);
        });

        it("should have a parent when a file exists in an ancestor folder", () => {
            const ast = getAst();
            const sourceFile = ast.createSourceFile("file.ts");
            const lowerSourceFile = ast.createSourceFile("dir1/dir2/file.ts");

            testDirectoryTree(sourceFile.getDirectory(), {
                directory: sourceFile.getDirectory(),
                sourceFiles: [sourceFile],
                children: [{
                    directory: ast.getDirectoryOrThrow("dir1"),
                    children: [{
                        directory: ast.getDirectoryOrThrow("dir1/dir2"),
                        sourceFiles: [lowerSourceFile]
                    }]
                }]
            });
        });

        it("should get the child directories", () => {
            const ast = getAst();
            const file1 = ast.createSourceFile("file1.ts");
            const file2 = ast.createSourceFile("dir1/file2.ts");
            const file3 = ast.createSourceFile("dir2/file3.ts");

            testDirectoryTree(file1.getDirectory(), {
                directory: file1.getDirectory(),
                sourceFiles: [file1],
                children: [{
                    directory: file2.getDirectory(),
                    sourceFiles: [file2]
                }, {
                    directory: file3.getDirectory(),
                    sourceFiles: [file3]
                }]
            });
        });

        it("should have the correct child directories after creating a file in a parent directory of multiple directories", () => {
            const ast = getAst();
            const file2 = ast.createSourceFile("dir1/file2.ts");
            const file3 = ast.createSourceFile("dir2/file3.ts");
            const file1 = ast.createSourceFile("file1.ts");

            testDirectoryTree(file1.getDirectory(), {
                directory: file1.getDirectory(),
                sourceFiles: [file1],
                children: [{
                    directory: file2.getDirectory(),
                    sourceFiles: [file2]
                }, {
                    directory: file3.getDirectory(),
                    sourceFiles: [file3]
                }]
            });
        });

        it("should get the directories at the root level", () => {
            const ast = getAst();
            const file1 = ast.createSourceFile("V:/file1.ts");
            const file2 = ast.createSourceFile("V:/file2.ts");
            const file3 = ast.createSourceFile("V:/dir1/file2.ts");

            testDirectoryTree(file1.getDirectory(), {
                directory: file1.getDirectory(),
                sourceFiles: [file1, file2],
                children: [{
                    directory: file3.getDirectory(),
                    sourceFiles: [file3]
                }]
            });
        });
    });

    describe(nameof<Directory>(d => d.getParentOrThrow), () => {
        const ast = getAst();
        const sourceFile = ast.createSourceFile("/file.ts");
        const rootDir = sourceFile.getDirectory();
        const dir = rootDir.createDirectory("dir");

        it("should get the parent when there's a parent", () => {
            expect(dir.getParentOrThrow().getPath()).to.equal(rootDir.getPath());
        });

        it("should throw when there's no parent", () => {
            expect(() => rootDir.getParentOrThrow()).to.throw();
        });
    });

    describe(nameof<Directory>(d => d.getDescendantSourceFiles), () => {
        it("should get all the descendant source files", () => {
            const ast = getAst();
            const sourceFiles = [
                ast.createSourceFile("someDir/inSomeFile/more/test.ts"),
                ast.createSourceFile("someDir/otherDir/deeper/test.ts"),
                ast.createSourceFile("someDir/test.ts"),
                ast.createSourceFile("someDir/childDir/deeper/test.ts"),
                ast.createSourceFile("final.ts")
            ];

            const finalFile = ast.getSourceFileOrThrow("final.ts");
            expect(finalFile.getDirectory().getDescendantSourceFiles().map(s => s.getFilePath()).sort()).to.deep.equal(sourceFiles.map(s => s.getFilePath()).sort());
        });
    });

    describe(nameof<Directory>(d => d.getDescendantDirectories), () => {
        it("should get all the descendant directories", () => {
            const ast = getAst();
            const rootDir = ast.createDirectory("");
            const directories = [
                rootDir.createDirectory("someDir"),
                rootDir.createDirectory("someDir/inSomeFile"),
                rootDir.createDirectory("someDir/inSomeFile/more"),
                rootDir.createDirectory("someDir/otherDir"),
                rootDir.createDirectory("someDir/otherDir/deeper"),
                rootDir.createDirectory("someDir/test"),
                rootDir.createDirectory("someDir/childDir")
            ];

            expect(rootDir.getDescendantDirectories().map(d => d.getPath()).sort()).to.deep.equal(directories.map(d => d.getPath()).sort());
        });
    });

    describe(nameof<Directory>(d => d.createSourceFile), () => {
        function doTest(input: string | SourceFileStructure | undefined, expectedText: string) {
            const ast = getAst();
            const directory = ast.createDirectory("dir");
            let sourceFile: SourceFile;
            if (typeof input === "undefined")
                sourceFile = directory.createSourceFile("sourceFile.ts");
            else if (typeof input === "string")
                sourceFile = directory.createSourceFile("sourceFile.ts", input);
            else
                sourceFile = directory.createSourceFile("sourceFile.ts", input);
            expect(directory.getSourceFiles()).to.deep.equal([sourceFile]);
            expect(sourceFile.getFilePath()).to.equal("/dir/sourceFile.ts");
            expect(sourceFile.getFullText()).to.equal(expectedText);
        }

        it("should create a source file in the directory when specifying no text or structure", () => {
            doTest(undefined, "");
        });

        it("should create a source file in the directory when specifying text", () => {
            const code = "const t = 34;";
            doTest(code, code);
        });

        it("should create a source file in the directory when specifying a structure", () => {
            doTest({ enums: [{ name: "MyEnum" }] }, "enum MyEnum {\n}\n");
        });

        it("should throw an exception if creating a source file at an existing path on the disk", () => {
            const ast = getAst([{ filePath: "/file.ts", text: "" }], ["/"]);
            const directory = ast.addExistingDirectory("/");
            expect(() => directory.createSourceFile("file.ts", "")).to.throw(errors.InvalidOperationError);
        });
    });

    describe(nameof<Directory>(d => d.addSourceFileIfExists), () => {
        it("should return undefined if adding a source file at a non-existent path", () => {
            const fileSystem = getFileSystemHostWithFiles([]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.createDirectory("dir");
            expect(directory.addSourceFileIfExists("non-existent-file.ts")).to.be.undefined;
        });

        it("should add a source file that exists", () => {
            const fileSystem = getFileSystemHostWithFiles([{ filePath: "dir/file.ts", text: "" }], ["dir"]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.addExistingDirectory("dir");
            const sourceFile = directory.addSourceFileIfExists("file.ts");
            expect(sourceFile).to.not.be.undefined;
        });
    });

    describe(nameof<Directory>(d => d.addExistingSourceFile), () => {
        it("should throw an exception if adding a source file at a non-existent path", () => {
            const fileSystem = getFileSystemHostWithFiles([]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.createDirectory("dir");
            expect(() => {
                directory.addExistingSourceFile("non-existent-file.ts");
            }).to.throw(errors.FileNotFoundError, `File not found: /dir/non-existent-file.ts`);
        });

        it("should add a source file that exists", () => {
            const fileSystem = getFileSystemHostWithFiles([{ filePath: "dir/file.ts", text: "" }], ["dir"]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.addExistingDirectory("dir");
            const sourceFile = directory.addExistingSourceFile("file.ts");
            expect(sourceFile).to.not.be.undefined;
        });
    });

    describe(nameof<Directory>(d => d.createDirectory), () => {
        const ast = getAst([], ["", "childDir"]);
        const directory = ast.createDirectory("some/path");
        directory.createDirectory("child");
        directory.createDirectory("../../dir/other/deep/path");
        directory.createDirectory("../../dir/other");

        it("should have created the directories in the first area", () => {
            testDirectoryTree(ast.getDirectoryOrThrow("some/path"), {
                directory: ast.getDirectoryOrThrow("some/path"),
                children: [{
                    directory: ast.getDirectoryOrThrow("some/path/child")
                }]
            });
        });

        it("should have created the directories in the second area", () => {
            testDirectoryTree(ast.getDirectoryOrThrow("dir/other"), {
                directory: ast.getDirectoryOrThrow("dir/other"),
                children: [{
                    directory: ast.getDirectoryOrThrow("dir/other/deep"),
                    children: [{
                        directory: ast.getDirectoryOrThrow("dir/other/deep/path")
                    }]
                }]
            });
        });

        it("should throw when a directory already exists at the specified path", () => {
            expect(() => directory.createDirectory("child")).to.throw(errors.InvalidOperationError);
        });

        it("should throw when a directory already exists on the file system at the specified path", () => {
            expect(() => ast.addExistingDirectory("").createDirectory("childDir")).to.throw(errors.InvalidOperationError);
        });
    });

    describe(nameof<Directory>(d => d.addDirectoryIfExists), () => {
        it("should return undefined when the directory doesn't exist", () => {
            const fileSystem = getFileSystemHostWithFiles([], ["dir"]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.addExistingDirectory("dir");
            expect(directory.addDirectoryIfExists("someDir")).to.be.undefined;
        });

        it("should add a directory relative to the specified directory", () => {
            const fileSystem = getFileSystemHostWithFiles([{ filePath: "dir/file.ts", text: "" }], ["dir", "dir2", "dir/child"]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.addExistingDirectory("dir");
            expect(directory.addDirectoryIfExists("child")).to.equal(ast.getDirectoryOrThrow("dir/child"));
            expect(directory.addDirectoryIfExists("../dir2")).to.equal(ast.getDirectoryOrThrow("dir2"));
        });
    });

    describe(nameof<Directory>(d => d.addExistingDirectory), () => {
        it("should throw when the directory doesn't exist", () => {
            const fileSystem = getFileSystemHostWithFiles([], ["dir"]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.addExistingDirectory("dir");
            expect(() => directory.addExistingDirectory("someDir")).to.throw(errors.DirectoryNotFoundError);
        });

        it("should add a directory relative to the specified directory", () => {
            const fileSystem = getFileSystemHostWithFiles([{ filePath: "dir/file.ts", text: "" }], ["dir", "dir2", "dir/child"]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.addExistingDirectory("dir");
            expect(directory.addExistingDirectory("child")).to.equal(ast.getDirectoryOrThrow("dir/child"));
            expect(directory.addExistingDirectory("../dir2")).to.equal(ast.getDirectoryOrThrow("dir2"));
        });
    });

    describe(nameof<Directory>(d => d.getDirectory), () => {
        const ast = new TsSimpleAst({ useVirtualFileSystem: true });
        const directory = ast.createDirectory("dir");
        const child1 = directory.createDirectory("child1");
        const child2 = directory.createDirectory("child2");
        const grandChild1 = child1.createDirectory("grandChild1");

        it("should get the directory based on the name", () => {
            expect(directory.getDirectory("child2")!.getPath()).to.equal(child2.getPath());
        });

        it("should get the directory based on the relative path", () => {
            expect(directory.getDirectory("child1/grandChild1")!.getPath()).to.equal(grandChild1.getPath());
        });

        it("should get the directory based on the absolute path", () => {
            expect(directory.getDirectory(grandChild1.getPath())!.getPath()).to.equal(grandChild1.getPath());
        });

        it("should get the directory based on a condition", () => {
            expect(directory.getDirectory(d => FileUtils.getBaseName(d.getPath()) === "child2")!.getPath()).to.equal(child2.getPath());
        });

        it("should not get the directory when it doesn't exist", () => {
            expect(directory.getDirectory("child3")).to.be.undefined;
        });
    });

    describe(nameof<Directory>(d => d.getDirectoryOrThrow), () => {
        const ast = new TsSimpleAst({ useVirtualFileSystem: true });
        const directory = ast.createDirectory("dir");
        const child1 = directory.createDirectory("child1");
        const child2 = directory.createDirectory("child2");

        it("should get the directory based on the name", () => {
            expect(directory.getDirectoryOrThrow("child2").getPath()).to.equal(child2.getPath());
        });

        it("should get the directory based on a condition", () => {
            expect(directory.getDirectoryOrThrow(d => FileUtils.getBaseName(d.getPath()) === "child2").getPath()).to.equal(child2.getPath());
        });

        it("should throw when it doesn't exist", () => {
            expect(() => directory.getDirectoryOrThrow("child3")).to.throw();
        });

        it("should throw when the condition doesn't match", () => {
            expect(() => directory.getDirectoryOrThrow(d => false)).to.throw();
        });
    });

    describe(nameof<Directory>(d => d.getSourceFile), () => {
        const ast = getAst();
        const directory = ast.createDirectory("dir");
        const existingFile = directory.createSourceFile("existing-file.ts");
        existingFile.saveSync();
        existingFile.forget();
        const child1 = directory.createSourceFile("child1.ts");
        const child2 = directory.createSourceFile("child2.ts");
        const subDir = directory.createDirectory("subDir");
        const child3 = subDir.createSourceFile("child3.ts");

        it("should not return a file that doesn't exist internally", () => {
            expect(directory.getSourceFile("existing-file.ts")).to.be.undefined;
        });

        it("should get based on the name", () => {
            expect(directory.getSourceFile("child2.ts")!.getFilePath()).to.equal(child2.getFilePath());
        });

        it("should get based on the path", () => {
            expect(directory.getSourceFile("subDir/child3.ts")!.getFilePath()).to.equal(child3.getFilePath());
        });

        it("should get based on a condition", () => {
            expect(directory.getSourceFile(f => FileUtils.getBaseName(f.getFilePath()) === "child2.ts")!.getFilePath()).to.equal(child2.getFilePath());
        });

        it("should return undefined when it doesn't exist", () => {
            expect(directory.getSourceFile("child3.ts")).to.be.undefined;
        });

        it("should throw when the condition doesn't match", () => {
            expect(directory.getSourceFile(s => false)).to.be.undefined;
        });
    });

    describe(nameof<Directory>(d => d.getSourceFileOrThrow), () => {
        const ast = getAst();
        const directory = ast.createDirectory("dir");
        const child1 = directory.createSourceFile("child1.ts");
        const child2 = directory.createSourceFile("child2.ts");
        const subDir = directory.createDirectory("subDir");
        const child3 = subDir.createSourceFile("child3.ts");

        it("should get based on the name", () => {
            expect(directory.getSourceFileOrThrow("child2.ts").getFilePath()).to.equal(child2.getFilePath());
        });

        it("should get based on the path", () => {
            expect(directory.getSourceFileOrThrow("subDir/child3.ts").getFilePath()).to.equal(child3.getFilePath());
        });

        it("should get based on a condition", () => {
            expect(directory.getSourceFileOrThrow(f => FileUtils.getBaseName(f.getFilePath()) === "child2.ts").getFilePath()).to.equal(child2.getFilePath());
        });

        it("should throw when it doesn't exist", () => {
            expect(() => directory.getSourceFileOrThrow("child3.ts")).to.throw();
        });

        it("should throw when the condition doesn't match", () => {
            expect(() => directory.getSourceFileOrThrow(s => false)).to.throw();
        });
    });

    describe(nameof<Directory>(d => d.copy), () => {
        it("should copy a directory to a new directory", () => {
            const ast = getAst();
            const mainDir = ast.createDirectory("mainDir");
            const dir = mainDir.createDirectory("dir");
            dir.createSourceFile("file.ts");
            dir.createDirectory("dir2").createDirectory("nested").createSourceFile("file2.ts");

            const newDir = dir.copy("../newDir");
            expect(newDir.getPath()).to.equal(FileUtils.pathJoin(mainDir.getPath(), newDir.getBaseName()));
            testDirectoryTree(newDir, {
                directory: newDir,
                sourceFiles: [ast.getSourceFileOrThrow("mainDir/newDir/file.ts")],
                children: [{
                    directory: ast.getDirectoryOrThrow("mainDir/newDir/dir2"),
                    children: [{
                        directory: ast.getDirectoryOrThrow("mainDir/newDir/dir2/nested"),
                        sourceFiles: [ast.getSourceFileOrThrow("mainDir/newDir/dir2/nested/file2.ts")]
                    }]
                }]
            }, mainDir);
        });

        it("should copy a directory to an existing directory", () => {
            const ast = getAst();
            const mainDir = ast.createDirectory("mainDir");
            const dir = mainDir.createDirectory("dir");
            dir.createSourceFile("file.ts");
            dir.createDirectory("child");
            const newDir = mainDir.createDirectory("newDir");
            const copyDir = dir.copy(newDir.getPath());

            expect(copyDir).to.equal(newDir, "returned directory should equal the existing directory");
            testDirectoryTree(copyDir, {
                directory: copyDir,
                sourceFiles: [ast.getSourceFileOrThrow("mainDir/newDir/file.ts")],
                children: [{
                    directory: ast.getDirectoryOrThrow("mainDir/newDir/child")
                }]
            }, mainDir);
        });

        it("should not throw when copying a directory to an existing directory on the file system", () => {
            const ast = getAst([], ["mainDir/newDir"]);
            const mainDir = ast.createDirectory("mainDir");
            const dir = mainDir.createDirectory("dir");
            dir.createSourceFile("file.ts");
            expect(() => dir.copy("../newDir")).to.not.throw();
        });

        it("should throw when copying a directory to an existing directory and a file exists in the other one", () => {
            const ast = getAst([]);
            const dir = ast.createDirectory("dir");
            dir.createDirectory("subDir").createSourceFile("file.ts");
            dir.createSourceFile("file.ts");
            dir.copy("../newDir");
            expect(() => dir.copy("../newDir")).to.throw();
        });

        it("should not throw when copying a directory to an existing directory with the overwrite option and a file exists in the other one", () => {
            const ast = getAst([]);
            const dir = ast.createDirectory("dir");
            dir.createSourceFile("file.ts");
            dir.copy("../newDir");
            expect(() => dir.copy("../newDir", { overwrite: true })).to.not.throw();
        });
    });

    describe(nameof<Directory>(d => d.delete), () => {
        it("should delete the file and remove all its descendants", async () => {
            const fileSystem = getFileSystemHostWithFiles([{ filePath: "dir/file.ts", text: "" }], ["dir"]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.addExistingDirectory("dir");
            const childDir = directory.createDirectory("childDir");
            const sourceFile = directory.addExistingSourceFile("file.ts");
            const otherSourceFile = ast.createSourceFile("otherFile.ts");

            await directory.delete();
            expect(directory._wasRemoved()).to.be.true;
            expect(childDir._wasRemoved()).to.be.true;
            expect(sourceFile.wasForgotten()).to.be.true;
            expect(otherSourceFile.wasForgotten()).to.be.false;
            expect(fileSystem.getDeleteLog()).to.deep.equal([{ path: "/dir" }]);
        });
    });

    describe(nameof<Directory>(d => d.deleteSync), () => {
        it("should delete the file and remove all its descendants synchronously", () => {
            const fileSystem = getFileSystemHostWithFiles([{ filePath: "dir/file.ts", text: "" }], ["dir"]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const directory = ast.addExistingDirectory("dir");
            const childDir = directory.createDirectory("childDir");
            const sourceFile = directory.addExistingSourceFile("file.ts");
            const otherSourceFile = ast.createSourceFile("otherFile.ts");

            directory.deleteSync();
            expect(directory._wasRemoved()).to.be.true;
            expect(childDir._wasRemoved()).to.be.true;
            expect(sourceFile.wasForgotten()).to.be.true;
            expect(otherSourceFile.wasForgotten()).to.be.false;
            expect(fileSystem.getDeleteLog()).to.deep.equal([{ path: "/dir" }]);
        });
    });

    describe(nameof<Directory>(d => d.remove), () => {
        it("should remove the file and all its descendants", () => {
            const ast = getAst();
            const directory = ast.createDirectory("dir");
            const childDir = directory.createDirectory("childDir");
            const sourceFile = directory.createSourceFile("file.ts");
            const otherSourceFile = ast.createSourceFile("otherFile.ts");

            directory.remove();
            expect(directory._wasRemoved()).to.be.true;
            expect(() => directory.getPath()).to.throw();
            expect(childDir._wasRemoved()).to.be.true;
            expect(sourceFile.wasForgotten()).to.be.true;
            expect(otherSourceFile.wasForgotten()).to.be.false;
        });
    });

    describe(nameof<Directory>(dir => dir.saveUnsavedSourceFiles), () => {
        it("should save all the unsaved source files asynchronously", async () => {
            const fileSystem = getFileSystemHostWithFiles([]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const otherFile = ast.createSourceFile("file.ts");
            const dir = ast.createDirectory("dir");
            dir.createSourceFile("file1.ts", "").saveSync();
            dir.createSourceFile("file2.ts", "");
            dir.createSourceFile("child/file3.ts", "");
            await dir.saveUnsavedSourceFiles();
            expect(dir.getDescendantSourceFiles().map(f => f.isSaved())).to.deep.equal([true, true, true]);
            expect(otherFile.isSaved()).to.be.false;
            expect(fileSystem.getWriteLog().length).to.equal(2); // 2 writes
            expect(fileSystem.getSyncWriteLog().length).to.equal(1); // 1 write
        });
    });

    describe(nameof<Directory>(dir => dir.saveUnsavedSourceFilesSync), () => {
        it("should save all the unsaved source files synchronously", () => {
            const fileSystem = getFileSystemHostWithFiles([]);
            const ast = new TsSimpleAst(undefined, fileSystem);
            const otherFile = ast.createSourceFile("file.ts");
            const dir = ast.createDirectory("dir");
            dir.createSourceFile("file1.ts", "").saveSync();
            dir.createSourceFile("file2.ts", "");
            dir.createSourceFile("child/file3.ts", "");
            dir.saveUnsavedSourceFilesSync();

            expect(dir.getDescendantSourceFiles().map(f => f.isSaved())).to.deep.equal([true, true, true]);
            expect(otherFile.isSaved()).to.be.false;
            expect(fileSystem.getWriteLog().length).to.equal(0);
            expect(fileSystem.getSyncWriteLog().length).to.equal(3); // 3 writes
        });
    });

    describe(nameof<Directory>(dir => dir.emit), () => {
        function setup(compilerOptions: ts.CompilerOptions) {
            const fileSystem = getFileSystemHostWithFiles([]);
            const ast = new TsSimpleAst({ compilerOptions }, fileSystem);
            const directory = ast.createDirectory("dir");

            directory.createSourceFile("file1.ts", "const t = '';");
            directory.createDirectory("subDir").createSourceFile("file2.ts");

            return {directory, fileSystem};
        }

        function runChecks(fileSystem: FileSystemHost & CustomFileSystemProps, result: DirectoryEmitResult, outDir: string, declarationDir: string) {
            const writeLog = fileSystem.getWriteLog();
            const createdDirectories = fileSystem.getCreatedDirectories();

            expect(result.getEmitSkipped()).to.be.false;
            expect(result.getOutputFilePaths().sort()).to.deep.equal(writeLog.map(l => l.filePath).sort());
            expect(writeLog.map(l => l.filePath).sort()).to.deep.equal([
                outDir + "/file1.js.map",
                outDir + "/file1.js",
                declarationDir + "/file1.d.ts",
                outDir + "/subDir/file2.js.map",
                outDir + "/subDir/file2.js",
                declarationDir + "/subDir/file2.d.ts"
            ].sort());
        }

        it("should emit correctly when not specifying anything", async () => {
            const {directory, fileSystem} = setup({ target: ts.ScriptTarget.ES5, outDir: "dist", declaration: true, sourceMap: true });
            const result = await directory.emit();
            runChecks(fileSystem, result, "dist", "dist");
        });

        it("should emit correctly when specifying a different out dir and no declaration dir in compiler options", async () => {
            const {directory, fileSystem} = setup({ target: ts.ScriptTarget.ES5, outDir: "dist", declaration: true, sourceMap: true });
            const result = await directory.emit({ outDir: "../newOutDir" });
            runChecks(fileSystem, result, "/newOutDir", "/newOutDir");
        });

        it("should emit correctly when specifying a different out dir and a declaration dir in compiler options", async () => {
            const {directory, fileSystem} = setup({ target: ts.ScriptTarget.ES5, outDir: "dist", declarationDir: "dec", declaration: true, sourceMap: true });
            const result = await directory.emit({ outDir: "../newOutDir" });
            runChecks(fileSystem, result, "/newOutDir", "dec");
        });

        it("should emit correctly when specifying a different declaration dir", async () => {
            const {directory, fileSystem} = setup({ target: ts.ScriptTarget.ES5, outDir: "dist", declarationDir: "dec", declaration: true, sourceMap: true });
            const result = await directory.emit({ declarationDir: "newDeclarationDir" });
            runChecks(fileSystem, result, "dist", "/dir/newDeclarationDir");
        });

        it("should emit correctly when specifying a different out and declaration dir", async () => {
            const {directory, fileSystem} = setup({ target: ts.ScriptTarget.ES5, outDir: "dist", declarationDir: "dec", declaration: true, sourceMap: true });
            const result = await directory.emit({ outDir: "", declarationDir: "newDeclarationDir" });
            runChecks(fileSystem, result, "/dir", "/dir/newDeclarationDir");
        });

        it("should emit correctly when specifying to only emit declaration files", async () => {
            const {directory, fileSystem} = setup({ target: ts.ScriptTarget.ES5, outDir: "dist", declarationDir: "dec", declaration: true, sourceMap: true });
            const result = await directory.emit({ outDir: "", declarationDir: "newDeclarationDir", emitOnlyDtsFiles: true });

            const writeLog = fileSystem.getWriteLog();
            expect(writeLog[0].filePath).to.equal("/dir/newDeclarationDir/file1.d.ts");
            expect(writeLog[1].filePath).to.equal("/dir/newDeclarationDir/subDir/file2.d.ts");
            expect(writeLog.length).to.equal(2);
        });

        it("should stop emitting when it encounters a problem", async () => {
            const fileSystem = getFileSystemHostWithFiles([]);
            const ast = new TsSimpleAst({ compilerOptions: { declaration: true }}, fileSystem);
            const directory = ast.createDirectory("dir");
            const subDir = directory.createDirectory("sub");
            subDir.createSourceFile("file1.ts", "");
            subDir.createSourceFile("file2.ts", "class Child {}\nexport class Parent extends Child {}");
            const result = await directory.emit();
            expect(result.getEmitSkipped()).to.be.true;

            const writeLog = fileSystem.getWriteLog();
            expect(result.getOutputFilePaths()).to.deep.equal(writeLog.map(l => l.filePath));
            expect(writeLog[0].filePath).to.equal("/dir/sub/file1.js");
            expect(writeLog[1].filePath).to.equal("/dir/sub/file1.d.ts");
            expect(writeLog.length).to.equal(2);
        });
    });

    describe(nameof<Directory>(dir => dir.emitSync), () => {
        function setup(compilerOptions: ts.CompilerOptions) {
            const fileSystem = getFileSystemHostWithFiles([]);
            const ast = new TsSimpleAst({ compilerOptions }, fileSystem);
            const directory = ast.createDirectory("dir");

            directory.createSourceFile("file1.ts", "const t = '';");
            directory.createDirectory("subDir").createSourceFile("file2.ts");

            return {directory, fileSystem};
        }

        function runChecks(fileSystem: FileSystemHost & CustomFileSystemProps, result: DirectoryEmitResult, outDir: string, declarationDir: string) {
            const writeLog = fileSystem.getSyncWriteLog();

            expect(result.getEmitSkipped()).to.be.false;
            expect(result.getOutputFilePaths()).to.deep.equal(writeLog.map(l => l.filePath));
            expect(writeLog[0].filePath).to.equal(outDir + "/file1.js.map");
            expect(writeLog[1].filePath).to.equal(outDir + "/file1.js");
            expect(writeLog[1].fileText).to.equal("var t = '';\n//# sourceMappingURL=file1.js.map");
            expect(writeLog[2].filePath).to.equal(declarationDir + "/file1.d.ts");
            expect(writeLog[3].filePath).to.equal(outDir + "/subDir/file2.js.map");
            expect(writeLog[4].filePath).to.equal(outDir + "/subDir/file2.js");
            expect(writeLog[5].filePath).to.equal(declarationDir + "/subDir/file2.d.ts");
            expect(writeLog.length).to.equal(6);
        }

        it("should emit correctly when not specifying anything", () => {
            const {directory, fileSystem} = setup({ target: ts.ScriptTarget.ES5, outDir: "dist", declaration: true, sourceMap: true });
            const result = directory.emitSync();
            runChecks(fileSystem, result, "dist", "dist");
        });

        it("should stop emitting when it encounters a problem", () => {
            const fileSystem = getFileSystemHostWithFiles([]);
            const ast = new TsSimpleAst({ compilerOptions: { declaration: true }}, fileSystem);
            const directory = ast.createDirectory("dir");
            const subDir = directory.createDirectory("sub");
            subDir.createSourceFile("file1.ts", "");
            subDir.createSourceFile("file2.ts", "class Child {}\nexport class Parent extends Child {}");
            const result = directory.emitSync();
            expect(result.getEmitSkipped()).to.be.true;

            const writeLog = fileSystem.getSyncWriteLog();
            expect(result.getOutputFilePaths()).to.deep.equal(writeLog.map(l => l.filePath));
            expect(writeLog[0].filePath).to.equal("/dir/sub/file1.js");
            expect(writeLog[1].filePath).to.equal("/dir/sub/file1.d.ts");
            expect(writeLog.length).to.equal(2);
        });
    });
});
