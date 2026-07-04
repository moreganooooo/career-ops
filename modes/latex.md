# Mode: latex — Deprecated

The LaTeX/Overleaf export mode has been deprecated and removed from the default system-layer distribution.

If you previously relied on the `.tex` export pipeline, recover the following artifacts from your VCS history: `templates/cv-template.tex` and `generate-latex.mjs`.

Recommended replacement: use the HTML → PDF pipeline (`templates/cv-template.html` + `generate-pdf.mjs`) which is the supported and tested export path.

If you want help migrating LaTeX-specific rules or template placeholders into the HTML pipeline, I can assist.
