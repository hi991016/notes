/**
 * assets/search-modal.js
 * ------------------------------------------------------------
 * Điều khiển search modal:
 *  1. Lazy-load filter list (Color / Last / Size...) bằng Section
 *     Rendering API, fetch từ 1 collection cố định (vd /collections/shoes)
 *     -> lấy được filter dù đang ở page nào (home, /about/, product...).
 *  2. Khi bấm "Search": gộp keyword (input[name="q"]) + các checkbox
 *     filter đã check thành query string, redirect sang /search.
 *  3. Khi bấm "Clear": reset input + bỏ check hết checkbox.
 *
 * Modal mở/đóng vẫn do JS hiện có của theme (Dawn) xử lý qua class
 * is-active / js-btn-search. Chỗ nào toggle modal mở, cần dispatch
 * thêm 1 custom event để trigger lazy-load lần đầu:
 *
 *   document.dispatchEvent(new CustomEvent('search-modal:open'));
 */

class SearchModal {
  constructor(root) {
    this.root = root;
    this.filterContainer = root.querySelector("[data-search-filter-container]");
    this.form = root.querySelector("[data-search-modal-form]");
    this.input = this.form ? this.form.querySelector('input[name="q"]') : null;

    this.filtersLoaded = false;
    this.sourceUrl = root.dataset.filterSourceUrl || "/collections/shoes";
    this.sectionId = root.dataset.filterSectionId || "search-modal-facets";

    if (!this.filterContainer || !this.form || !this.input) return;

    this.bindOpenTrigger();
    // this.bindFormSubmit();
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => this.loadFilters());
    } else {
      setTimeout(() => this.loadFilters(), 200);
    }
  }

  // Lazy-load filter khi modal được mở lần đầu tiên
  // document.dispatchEvent(new CustomEvent("search-modal:open"));
  bindOpenTrigger() {
    document.addEventListener("search-modal:open", () => {
      if (!this.filtersLoaded) this.loadFilters();
    });
  }

  async loadFilters() {
    this.filterContainer.setAttribute("aria-busy", "true");

    try {
      const response = await fetch(
        `${this.sourceUrl}?section_id=${this.sectionId}`,
      );
      if (!response.ok)
        throw new Error(`Fetch filters failed: ${response.status}`);

      const html = await response.text();
      this.filterContainer.innerHTML = html;
      this.filtersLoaded = true;

      this.bindFilterActions();
    } catch (error) {
      console.error("[search-modal] Không load được filter:", error);
      this.filterContainer.innerHTML =
        '<p class="c-search_filters_error">Không tải được bộ lọc, thử lại sau.</p>';
    } finally {
      this.filterContainer.removeAttribute("aria-busy");
    }
  }

  // Bind nút Search / Clear nằm bên trong HTML vừa được inject
  bindFilterActions() {
    const submitBtn = this.filterContainer.querySelector(
      "[data-search-modal-submit]",
    );
    const clearBtn = this.filterContainer.querySelector(
      "[data-search-modal-clear]",
    );

    if (submitBtn) submitBtn.addEventListener("click", () => this.submit());
    if (clearBtn) clearBtn.addEventListener("click", () => this.clear());
  }

  // Enter trong ô input keyword cũng submit luôn
  bindFormSubmit() {
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submit();
    });
  }

  submit() {
    const params = new URLSearchParams();
    const keyword = this.input.value.trim();

    params.set("q", keyword || "*");
    params.set("type", "product");
    params.set("options[prefix]", "last");

    this.filterContainer
      .querySelectorAll('input[type="checkbox"]:checked')
      .forEach((checkbox) => {
        params.append(checkbox.name, checkbox.value);
      });

    const searchUrl = (window.routes && window.routes.search_url) || "/search";
    window.location.href = `${searchUrl}?${params.toString()}`;
  }

  clear() {
    this.input.value = "";
    this.filterContainer
      .querySelectorAll('input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.checked = false;
      });
  }
}

document
  .querySelectorAll("[data-search-modal]")
  .forEach((root) => new SearchModal(root));
