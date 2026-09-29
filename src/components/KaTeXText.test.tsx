import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import KaTeXText from './KaTeXText';

describe('KaTeXText', () => {
  it.each(['$x^2$', '$$x^2$$', '\\(x^2\\)', '\\[x^2\\]'])('renders %s as math', (text) => {
    const html = renderToStaticMarkup(<KaTeXText text={`Practice ${text} today.`} />);
    expect(html).toContain('class="katex"');
    expect(html).toContain('Practice');
    expect(html).toContain('today.');
  });

  it('escapes markup in feedback', () => {
    const html = renderToStaticMarkup(<KaTeXText text={'<script>alert(1)</script>'} />);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
