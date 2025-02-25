import * as d3 from "d3";

export function wrapText(
  textSelection: d3.Selection<SVGTextElement, unknown, null, undefined>,
  maxWidth: number
) {
  textSelection.each(function () {
    const text = d3.select(this);
    const words = text.text().split(/\s+/).reverse();
    let word: string;
    let line: string[] = [];
    let lineNumber = 0;
    const lineHeight = 1.1; // ems
    const x = text.attr("x") || 0;
    const y = text.attr("y") || 0;
    const dy = parseFloat(text.attr("dy") || "0") || 0;
    let tspan = text
      .text(null)
      .append("tspan")
      .attr("x", x)
      .attr("y", y)
      .attr("dy", dy + "em");

    while (words.length) {
      word = words.pop()!;
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node()!.getComputedTextLength() > maxWidth) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", ++lineNumber * lineHeight + dy + "em")
          .text(word);
      }
    }
  });
}
