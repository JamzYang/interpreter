import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Transcription Text Parser', () => {
    const parseTranscription = (text: string) => {
        const regex = /<chinese_text>([^<]*)<\/?english_text>([^]*)/;
        const matches = text.match(regex);
        return matches ? {
            chinese_text: matches[1].trim(),
            english_text: matches[2].trim()
        } : {
            chinese_text: '',
            english_text: ''
        };
    };

    it('should correctly parse Chinese and English text', () => {
        const testCases = [
            {
                input: '<chinese_text>可以听见我说活吗？<english_text>Can you hear me?',
                expected: {
                    chinese_text: '可以听见我说活吗？',
                    english_text: 'Can you hear me?'
                }
            },
            {
                input: '<chinese_text>你好世界<english_text>Hello World',
                expected: {
                    chinese_text: '你好世界',
                    english_text: 'Hello World'
                }
            },
            {
                input: '<chinese_text>测试特殊字符！@#￥%<english_text>Test special chars!@#$%',
                expected: {
                    chinese_text: '测试特殊字符！@#￥%',
                    english_text: 'Test special chars!@#$%'
                }
            },
            //中英文之间有换行符
            {
                input: '<chinese_text>现在开始说中文。\n</english_text>Now let\'s start speaking Chinese.',
                expected: {
                    chinese_text: '现在开始说中文。',
                    english_text: 'Now let\'s start speaking Chinese.'
                }
            },
            {
              input: '<chinese_text>有闭合标记</chinese_text>\n</english_text>has close tag',
              expected: {
                  chinese_text: '现在开始说中文。',
                  english_text: 'Now let\'s start speaking Chinese.'
              }
          },
            {
                input: '<chinese_text><english_text>',
                expected: {
                    chinese_text: '',
                    english_text: ''
                }
            }
        ];

        testCases.forEach(({ input, expected }) => {
            const result = parseTranscription(input);
            console.log('result==>>>',result);
            expect(result).toEqual(expected);
        });
    });

    it('should handle invalid input gracefully', () => {
        const invalidInputs = [
            '',
            'invalid text',
            '<chinese_text>只有中文',
            '<english_text>only english',
            'random<chinese_text>text<english_text>here'
        ];

        invalidInputs.forEach(input => {
            const result = parseTranscription(input);
            expect(result).toEqual({
                chinese_text: '',
                english_text: ''
            });
        });
    });

    const parseTranscriptionJson = (text: string) => {
        const jsonBlockRegex = /```json[\s\S]*?```/;
        const matches = text.match(jsonBlockRegex);
        return matches ? {
            content: matches[1],
            isValid: true
        } : {
            content: '',
            isValid: false
        };
    };

    it('should correctly parse json code blocks', () => {
        const testCases = [
            {
                input: '```json\n{"name": "test"}\n```',
                expected: {
                    content: '\n{"name": "test"}\n',
                    isValid: true
                }
            },
            {
                input: '```json{"name": "test"}```',
                expected: {
                    content: '{"name": "test"}',
                    isValid: true
                }
            },
            {
                input: 'Some text before\n```json\n{\n  "key": "value"\n}\n```\nSome text after',
                expected: {
                    content: '{\n  "key": "value"\n}',
                    isValid: true
                }
            },
            {
                input: '{\n  "nested": "```"\n}\n',
                expected: {
                    content: '{\n  "nested": "```"\n}\n',
                    isValid: true
                }
            }
        ];

        testCases.forEach(({ input, expected }) => {
            const result = parseTranscriptionJson(input);
            expect(result).toEqual(expected);
        });
    });

    it('should handle invalid json code blocks', () => {
        const invalidInputs = [
            '',
            '```python\ndef test():\n    pass\n```',
            'just some text',
            '```json',
            'json```'
        ];

        invalidInputs.forEach(input => {
            const result = parseTranscriptionJson(input);
            expect(result).toEqual({
                content: '',
                isValid: false
            });
        });
    });

    const parseTranscript = (text: string) => {
        const regex = /<chinese>(.*?)<\/chinese><english>(.*?)<\/english>/;
        const matches = text.match(regex);
        return matches ? {
            chinese: matches[1].trim(),
            english: matches[2].trim()
        } : {
            chinese: '',
            english: ''
        };
    };

    it('should correctly parse transcript format', () => {
        const testCases = [
            {
                input: '<chinese>你好世界</chinese><english>Hello World</english>',
                expected: {
                    chinese: '你好世界',
                    english: 'Hello World'
                }
            },
            {
                input: '<chinese>测试特殊字符！@#￥%</chinese><english>Test special chars!@#$%</english>',
                expected: {
                    chinese: '测试特殊字符！@#￥%',
                    english: 'Test special chars!@#$%'
                }
            },
            {
                input: '<chinese>多行\n文本</chinese><english>Multi-line\ntext</english>',
                expected: {
                    chinese: '多行\n文本',
                    english: 'Multi-line\ntext'
                }
            }
        ];

        testCases.forEach(({ input, expected }) => {
            const result = parseTranscript(input);
            expect(result).toEqual(expected);
        });
    });

    it('should handle invalid transcript format', () => {
        const invalidInputs = [
            '',
            '<chinese>只有中文</chinese>',
            '<english>only english</english>',
            '没有标签的文本',
            '<chinese>标签未闭合<english>',
            '<chinese></chinese><english></english>'
        ];

        invalidInputs.forEach(input => {
            const result = parseTranscript(input);
            expect(result).toEqual({
                chinese: '',
                english: ''
            });
        });
    });
});