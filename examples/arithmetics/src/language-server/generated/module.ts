/******************************************************************************
 * This file was generated by langium-cli 0.1.0.
 * DO NOT EDIT MANUALLY!
 ******************************************************************************/

import { LangiumGeneratedServices, LangiumServices, Module } from 'langium';
import { ArithmeticsAstReflection } from './ast';
import { ArithmeticsGrammarAccess } from './grammar-access';
import { Parser } from './parser';

const metaData = {
    languageId: 'arithmetics',
    fileExtensions: ['.calc']
};

export const ArithmeticsGeneratedModule: Module<LangiumServices, LangiumGeneratedServices> = {
    parser: {
        LangiumParser: (injector) => new Parser(injector)
    },
    GrammarAccess: () => new ArithmeticsGrammarAccess(),
    AstReflection: () => new ArithmeticsAstReflection(),
    LanguageMetaData: () => metaData
};
