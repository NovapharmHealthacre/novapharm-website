const root = document.querySelector("[data-esco-catalogue]");
if (root) {
  const input = root.querySelector("[data-esco-search]");
  const select = root.querySelector("[data-esco-category]");
  const count = root.querySelector("[data-esco-visible-count]");
  const noResults = root.querySelector("[data-esco-no-results]");
  const sections = [...root.querySelectorAll("[data-esco-section]")];
  const allItems = [...root.querySelectorAll("[data-esco-entry]")];
  const folded = (s) => (s || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLocaleLowerCase("en-GB").trim();
  const apply = () => {
    const q = folded(input?.value);
    const category = select?.value || "";
    let visible = 0;
    for (const item of allItems) {
      const yes = (!category || item.dataset.escoCategory === category) && (!q || folded(item.dataset.escoSearch).includes(q));
      item.hidden = !yes;
      if (yes) visible++;
    }
    for (const section of sections) {
      const hasAny = [...section.querySelectorAll("[data-esco-entry]")].some((item) => !item.hidden);
      section.hidden = !hasAny;
      for(const sub of section.querySelectorAll("[data-esco-subcategory]")){
        const siblings = sub.nextElementSibling;
        const has = siblings && [...siblings.querySelectorAll("[data-esco-entry]")].some(item=>!item.hidden);
        sub.hidden = !has;
        if (siblings) siblings.hidden = !has;
      }
    }
    if (count) count.textContent = visible + " catalogue entries";
    if (noResults) noResults.hidden = visible !== 0;
  };
  input?.addEventListener("input",apply);
  select?.addEventListener("change",apply);
  apply();
}
