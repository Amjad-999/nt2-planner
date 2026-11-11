# Emoji assets — licences

The artwork in `svg/` and the glyphs in `nt2-emoji.woff2` are **Twemoji 15**.

- Graphics: Copyright (c) Twitter, Inc and other contributors (maintained by
  the jdecked/twemoji community fork). Licensed under **CC-BY 4.0** —
  https://creativecommons.org/licenses/by/4.0/
- Font build: `twemoji-colr-font` 15.0.3 (https://github.com/mrdrogdrog/twemoji-color-font),
  licensed under the **SIL Open Font License 1.1**. `nt2-emoji.woff2` is a subset of it
  (only the sequences listed in `src/data/emoji/registry.json`), renamed as the OFL asks
  of modified versions.

Nothing here was drawn for this project and nothing was altered apart from
subsetting. Rebuild with `scripts/build-emoji.py`.
