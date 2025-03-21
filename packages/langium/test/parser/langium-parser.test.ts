/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem, type AstNode, type LangiumCoreServices } from 'langium';
import { describe, expect, test, beforeEach } from 'vitest';
import { createLangiumGrammarServices, createServicesForGrammar  } from 'langium/grammar';
import { parseHelper  } from 'langium/test';

describe('Partial parsing', () => {
    const content = `
    grammar Test
    entry Model: 'model' (a+=A | b+=B)*;
    A: 'a' name=ID;
    B: 'b' name=ID;
    terminal ID: /[_a-zA-Z][\\w_]*/;
    hidden terminal WS: /\\s+/;
    `;

    let services: LangiumCoreServices;

    beforeEach(async () => {
        services = await createServicesForGrammar({ grammar: content });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function expectCorrectParse(text: string, rule?: string): any {
        const result = services.parser.LangiumParser.parse(text, { rule });
        expect(result.parserErrors.length).toBe(0);
        return result.value;
    }

    function expectErrorneousParse(text: string, rule?: string): void {
        const result = services.parser.LangiumParser.parse(text, { rule });
        expect(result.parserErrors.length).toBeGreaterThan(0);
    }

    test('Should parse correctly with normal entry rule', () => {
        const result = expectCorrectParse('model a Foo b Bar');
        expect(result.a[0].name).toEqual('Foo');
        expect(result.b[0].name).toEqual('Bar');
    });

    test('Should parse correctly with alternative entry rule A', () => {
        const result = expectCorrectParse('a Foo', 'A');
        expect(result.name).toEqual('Foo');
        expectErrorneousParse('model a Foo', 'A');
        expectErrorneousParse('b Bar', 'A');
    });

    test('Should parse correctly with alternative entry rule B', () => {
        const result = expectCorrectParse('b Foo', 'B');
        expect(result.name).toEqual('Foo');
        expectErrorneousParse('model b Foo', 'B');
        expectErrorneousParse('a Foo', 'B');
    });

    test('Parse helper supports using alternative entry rule A', async () => {
        const parse = parseHelper<A>(services);
        const document = await parse('a Foo', { parserOptions: { rule: 'A' } });
        expect(document.parseResult.parserErrors.length).toBe(0);
        expect(document.parseResult.value.name).toEqual('Foo');
    });

});

describe('hidden node parsing', () => {

    test('finishes in expected time', async () => {
        const parser = createLangiumGrammarServices(EmptyFileSystem).grammar.parser.LangiumParser;
        let content = 'Rule:';
        // Adding hidden nodes used to cause exponential parsing time behavior
        for (let i = 0; i < 2500; i++) {
            content += "'a' /* A */ /* B */ /* C */\n";
        }
        content += ';';
        const start = Date.now();
        // This roughly takes 100-300 ms on a modern machine
        // If it takes longer, the hidden node parsing is likely to be exponential
        // On an older version of the parser, this took ~5 seconds
        const result = parser.parse(content);
        expect(result.lexerErrors).toHaveLength(0);
        expect(result.parserErrors).toHaveLength(0);
        const end = Date.now();
        expect(end - start).toBeLessThan(1000);
    });

});

interface A extends AstNode {
    name: string
}

describe('Resolve default references', async () => {
    const grammar = `
        grammar Test
        entry Model:
            elements+=(Primitve|Type) *;

        interface Primitive {
            name:string
        }
        interface Type {
            name:string
            primitive:@Primitive = 'int32'
            primitiveArray:@Primitive[] = ['int32', 'int64']
        }
        Primitve returns Primitive:
            'primitive' name=ID;

        Type returns Type:
            'type' name=ID ('extends' primitive=[Primitive:ID])?
            ('implements' primitiveArray+=[Primitive:ID] (',' primitiveArray+=[Primitive:ID])*)?;

        hidden terminal WS: /\\s+/;
        terminal ID: /[_a-zA-Z][\\w_]*/;
    `;

    const parser = parseHelper<AstNode>(await createServicesForGrammar({grammar}));

    test('resolve default references', async () => {
        const document = await parser(`
            primitive int8
            primitive int16
            primitive int32
            primitive int64
            type T
            type T2 extends int8 implements int8, int16
        `, { documentUri: 'test://test.model' });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = document.parseResult.value as any;

        // check default references are valids
        expect(model.elements[4].primitive?.ref?.name).toBe('int32');
        expect(model.elements[4].primitiveArray[0].ref?.name).toBe('int32');
        expect(model.elements[4].primitiveArray[1].ref?.name).toBe('int64');

        // check default references are properly overriden
        expect(model.elements[5].primitive?.ref?.name).toBe('int8');
        expect(model.elements[5].primitiveArray[0].ref?.name).toBe('int8');
        expect(model.elements[5].primitiveArray[1].ref?.name).toBe('int16');
    });
});
