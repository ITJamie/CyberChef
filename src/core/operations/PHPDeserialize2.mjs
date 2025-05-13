/**
* @author Jarmo van Lenthe [github.com/jarmovanlenthe]
* @copyright Jarmo van Lenthe
* @license Apache-2.0
*/

import Operation from "../Operation.mjs";
import OperationError from "../errors/OperationError.mjs";

/**
* PHP Deserialize operation
*/
class PHPDeserialize2 extends Operation {

   /**
    * PHPDeserialize constructor
    */
    constructor() {
        super();

        this.name = "PHP Deserialize2";
        this.module = "Default";
        this.description = "Deserializes PHP serialized data, outputting keyed arrays as JSON.<br><br>This function does not support <code>object</code> tags.<br><br>Example:<br><code>a:2:{s:1:&quot;a&quot;;i:10;i:0;a:1:{s:2:&quot;ab&quot;;b:1;}}</code><br>becomes<br><code>{&quot;a&quot;: 10,0: {&quot;ab&quot;: true}}</code><br><br><u>Output valid JSON:</u> JSON doesn't support integers as keys, whereas PHP serialization does. Enabling this will cast these integers to strings. This will also escape backslashes.";
        this.infoURL = "http://www.phpinternalsbook.com/classes_objects/serialization.html";
        this.inputType = "string";
        this.outputType = "string";
        this.args = [
            {
                "name": "Output valid JSON",
                "type": "boolean",
                "value": true
            }
        ];
    }

   /**
    * @param {string} input
    * @param {Object[]} args
    * @returns {string}
    */
    run(input, args) {
        const inputPart = input.split("");

       /**
        * Helper function to handle deserialized objects.
        * @returns {Object}
        */
        function handleObject() {
            const items = parseInt(readUntil(":"), 10) * 2;
            expect("{");
            const result = {};
            let isKey = true;
            let lastItem = null;
            for (let idx = 0; idx < items; idx++) {
                if (isKey) {
                    const key = readUntil(":");
                    expect('"');
                    lastItem = key;
                    isKey = false;
                } else {
                    const value = handleInput();
                    result[lastItem] = value;
                    isKey = true;
                }
            }
            expect("}");
            return result;
        }
        /**
         * Helper function to handle deserialized arrays.
         * @returns {Array}
         */
        function handleArray() {
            const items = parseInt(readUntil(":"), 10) * 2;
            expect("{");
            const result = [];
            let isKey = true;
            let lastItem = null;
            for (let idx = 0; idx < items; idx++) {
                const item = handleInput();
                if (isKey) {
                    lastItem = item;
                    isKey = false;
                } else {
                    const numberCheck = lastItem.match(/[0-9]+/);
                    if (args[0] && numberCheck && numberCheck[0].length === lastItem.length) {
                        result.push('"' + lastItem + '": ' + item);
                    } else {
                        result.push(lastItem + ": " + item);
                    }
                    isKey = true;
                }
            }
            expect("}");
            return result;
        }
        /**
        * Recursive method for deserializing.
        * @returns {*}
        */
        function handleInput() {
            // Debug statement to check the current character being read
            // eslint-disable-next-line no-console
            console.log("Reading next character:", inputPart[0]);

            const kind = read(1).toLowerCase();
            switch (kind) {
                case "n":
                    expect(";");
                    return "null";
                case "i":
                case "d":
                case "b": {
                    expect(":");
                    const data = readUntil(";");
                    if (kind === "b") {
                        return (parseInt(data, 10) !== 0);
                    }
                    return data;
                }

                case "a":
                    expect(":");
                    return JSON.stringify(handleArray());

                case "s": {
                    expect(":");
                    const length = readUntil(":");
                    expect("\"");
                    const value = read(length);
                    expect('";');
                    if (args[0]) {
                        return '"' + value.replace(/"/g, '\\"') + '"'; // lgtm [js/incomplete-sanitization]
                    } else {
                        return '"' + value + '"';
                    }
                }

                case "o": {
                    expect(":");
                    return JSON.stringify(handleObject());
                }

                default:
                    throw new OperationError("Unknown type: " + kind);
            }
        }
        // eslint-disable-next-line jsdoc/require-jsdoc
        function read(length) {
            let result = "";
            for (let idx = 0; idx < length; idx++) {
                const char = inputPart.shift();
                if (char === undefined) {
                    throw new OperationError("End of input reached before end of script");
                }
                result += char;
            }
            return result;
        }
        /**
         * Read characters from the input until `until` is found.
         * @param until
         * @returns {string}
         */
        function readUntil(until) {
            let result = "";
            for (;;) {
                const char = read(1);
                if (char === until) {
                    break;
                } else {
                    result += char;
                }
            }
            return result;

        }
        // eslint-disable-next-line jsdoc/require-jsdoc
        function expect(expect) {
            const result = read(expect.length);
            if (result !== expect) {
                throw new OperationError("Unexpected input found2: " + result);
            }
            return result;
        }

        try {
            return handleInput();
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Deserialization error:", error.message);
            throw error;
        }
    }
}

export default PHPDeserialize2;
