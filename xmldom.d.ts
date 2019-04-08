// Based on @types/xmldom

declare module "xmldom" {
    namespace xmldom {
        var DOMParser: DOMParserStatic;
        var XMLSerializer: XMLSerializerStatic;
        var DOMImplementation: DOMImplementationStatic;

        interface DOMImplementationStatic {
            new(): DOMImplementation;
        }

        interface DOMParserStatic {
            new (): DOMParser;
            new (options: Options): DOMParser;
        }

        interface XMLSerializerStatic {
            new (): XMLSerializer;
        }

        interface DOMParser {
            parseFromString(xmlsource: string, mimeType?: string): Document;
        }

        interface XMLSerializer {
            serializeToString(node: Node, isHtml?: boolean): string;
        }

        interface Options {
            locator?: any;
            errorHandler?: ErrorHandlerFunction | ErrorHandlerObject;
        }

        interface ErrorHandlerFunction {
            (level: string, msg: any): any;
        }

        interface ErrorHandlerObject {
            warning?: (msg: any) => any;
            error?: (msg: any) => any;
            fatalError?: (msg: any) => any;
        }
    }

    export = xmldom;
}
