import { h } from './store.js';

export function renderAbout(host, { pigments }) {
  const P = (...c) => h('p', {}, ...c);
  const A = (href, text) => h('a', { href, target: '_blank', rel: 'noopener' }, text);
  const domains = new Map();
  for (const p of pigments) for (const [, url] of p.sources || []) {
    try {
      const d = new URL(url).hostname.replace(/^www\./, '');
      domains.set(d, (domains.get(d) || 0) + 1);
    } catch { /* ignore malformed */ }
  }

  host.replaceChildren(
    P('Paintings are made of stuff: ground minerals, burnt bones, insect dyes, glass, and later the products of industrial chemistry. What a painter could make depended on what a colourman could sell, and that changed over time. This project lets you move through that history and look at it three ways.'),

    h('h2', {}, 'Why pigments'),
    P('For most of history the palette was short, and some colours were precious. In 1485 Domenico Ghirlandaio\'s contract for an altarpiece in Florence required the blue to be ultramarine "of the value of about four florins the ounce". The rare blue was priced like a precious metal and written into the deal. Then chemistry changed everything. Prussian blue (about 1706) was the first modern synthetic pigment. The 19th century brought cobalt blue, chrome and cadmium yellows, emerald green, viridian, synthetic ultramarine and cobalt violet, and in 1841 the collapsible tin tube let painters carry them outdoors. The yellow light in Turner, the violet shadows of the Impressionists and the blaze of Fauvism all depend on materials that did not exist a few generations earlier.'),
    P('Because every pigment has a birthday, the materials of a painting can also date it. That is why Edward Forbes began collecting pigments at Harvard\'s Fogg Museum early in the 20th century, and why his collection, now some 2,700 samples at the Straus Center for Conservation and Technical Studies, is still used as a reference in the lab. The Lab section is built around that idea.'),

    h('h2', {}, 'The three rooms'),
    h('h3', {}, 'The Wall'),
    P(`${pigments.length} pigments as jars on shelves, after the cabinets of the Forbes collection. The dial fills and empties them by date, for a painter in Europe or anywhere on Earth. Pigments can also disappear: lead-tin yellow was forgotten around 1750 and Egyptian blue after antiquity. Each jar opens a card with its chemistry, its history, where to see it and what an X-ray spectrometer would detect.`),
    h('h3', {}, 'The Time Machine'),
    P('Choose a painting, or your own photo, and a year. The image is repainted using only colours that could be mixed from the pigments on the shelf that year. Side panels show how much of the picture can be matched closely, which pigments a period painter would have needed, and which colours were out of reach. Two charts show the mixable range of colour and how it grew over 42,000 years.'),
    h('h3', {}, 'The Lab'),
    P('Six real cases (the Vinland Map, Beltracchi\'s Campendonk, van Meegeren\'s Vermeer, the "Matter Pollocks" studied at Harvard, the medieval woman with lapis lazuli in her teeth, and Van Gogh\'s Sunset at Montmajour), each with a simulated X-ray fluorescence spectrum, lab notes and questions. A "night shift" mode generates endless cases from the pigment database.'),

    h('h2', {}, 'How it works'),
    h('h3', {}, 'Dates'),
    P('Every pigment has two spans: when painters in Europe could obtain it, and when it was in use anywhere in the world. Dates come from conservation literature (ColourLex, the MFA Boston CAMEO database, National Gallery technical studies, WebExhibits\' Pigments through the Ages and others; each pigment card lists its sources). Dates are approximate by nature: a discovery, the first documented use and wide commercial availability can be decades apart. Where they differ, this project uses the date from which a working painter could realistically buy the pigment.'),
    h('h3', {}, 'Colour and mixing'),
    P('Each pigment is represented by an sRGB approximation of its full-strength colour plus a tinting strength. Mixtures use the single-constant Kubelka–Munk model, the standard first approximation for paint, evaluated in three bands. This captures the subtractive, darkening behaviour of real paint: blue and yellow make green, not grey. For a given year the program builds every single pigment, every pair at four ratios, tints of each with the brightest white and with lead white, darker shades with black, and thin glazes of transparent pigments over black, which give the deep darks of Old Master backgrounds. After deduplication in OKLab that is between about 50 colours (a cave painter\'s) and 14,000 (today\'s). Black pigments take the deepest value a photograph records, the black-point compensation colour management uses.'),
    P('To repaint an image, a Web Worker builds a 33×33×33 lookup table that maps every point of the RGB cube to its nearest mixable colour in OKLab, a perceptually uniform colour space. Lightness counts 1.4 times as much as hue and chroma, because painters protect values first. Pixels are mapped through the table with trilinear interpolation. A pixel counts as "matched closely" when the repainted colour lies within 0.04 of the original in OKLab, roughly two just-noticeable differences.'),
    P('The range chart measures the area of the convex hull of all mixable colours in the OKLab a–b plane (hue and intensity, ignoring lightness), as a share of today\'s.'),
    h('h3', {}, 'X-ray fluorescence'),
    P('Spectra place Gaussian peaks at true emission-line energies from the ', A('https://xdb.lbl.gov/Section1/Table_1-2.pdf', 'X-ray Data Booklet (LBNL)'), '. The model widens peaks with energy as a silicon drift detector does, weakens light elements to mimic absorption in air, and adds scatter from a rhodium tube, a continuum background and counting noise. Peak heights are illustrative, not quantitative. The overlaps are real: arsenic and lead, barium and titanium, sulfur and lead all collide, and several cases depend on that.'),
    P('Generated night-shift cases choose a year and a period-correct palette. About half the time they slip in one pigment whose characteristic element has a terminus post quem later than the claimed date. The answer is computed from the same pigment database the Wall uses.'),

    h('h2', {}, 'What this cannot show'),
    h('ul', {},
      h('li', {}, 'Screen colour is not pigment. Particle size, gloss, translucency, glazing and binder change how a colour looks, and an sRGB display cannot show the most saturated pigments.'),
      h('li', {}, 'Three-band Kubelka–Munk is an approximation. Real mixtures depend on the full reflectance spectrum.'),
      h('li', {}, 'Available is not the same as affordable or used. Trade routes, guild rules, price and taste shaped real palettes. The "patron" switch only models the most famous case, lapis ultramarine.'),
      h('li', {}, 'The European timeline is better documented than others. The "Anywhere on Earth" view includes pigments from Egypt, China, Mesoamerica and South Asia, but only a sample of the world\'s colour traditions.'),
      h('li', {}, 'Paintings change. Reds fade, yellows brown, varnish yellows. The "original" in the Time Machine is the painting as it looks today.')
    ),

    h('h2', {}, 'Credits'),
    P('Painting images are public-domain photographs of public-domain works, taken from open-source research repositories that redistribute them. Search results are served by the ', A('https://api.artic.edu/docs/', 'Art Institute of Chicago API'), ' and include only works it marks as public domain.'),
    P('Typefaces under the SIL Open Font License: Bodoni Moda by Owen Earl, IBM Plex Sans by IBM, Courier Prime by Alan Dague-Greene.'),
    P('Pigment research draws most on ', [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([d]) => d).join(', '), ', and others listed on each pigment card; case sources are listed in the Lab.'),
    P('Built for CS 85 at Harvard (fall 2026) with help from Claude, an AI assistant, for research, code and copy, all reviewed and checked against sources. No generative image model was used for the core experience. The optional script in the repository compares an image model\'s "period repainting" with the colour-science result.'),
  );
}
