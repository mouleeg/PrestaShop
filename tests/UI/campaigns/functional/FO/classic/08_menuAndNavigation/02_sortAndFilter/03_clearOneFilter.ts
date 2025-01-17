// Import utils
import testContext from '@utils/testContext';

// Import common tests
import loginCommon from '@commonTests/BO/loginBO';

// Import BO pages
import productsPage from '@pages/BO/catalog/products';
import productSettingsPage from '@pages/BO/shopParameters/productSettings';

// Import FO pages
import {homePage} from '@pages/FO/classic/home';

import {expect} from 'chai';
import type {BrowserContext, Page} from 'playwright';
import {
  boDashboardPage,
  foClassicCategoryPage,
  utilsPlaywright,
} from '@prestashop-core/ui-testing';

const baseContext: string = 'functional_FO_classic_menuAndNavigation_sortAndFilter_clearOneFilter';

/*
Pre-condition:
- Get the number of active products
Scenario:
- Filter products by composition and availability
- Clear one filter
 */
describe('FO - Menu and navigation : Clear one filter', async () => {
  let browserContext: BrowserContext;
  let page: Page;
  let numberOfActiveProducts: number;
  let productsNumber: number;

  // before and after functions
  before(async function () {
    browserContext = await utilsPlaywright.createBrowserContext(this.browser);
    page = await utilsPlaywright.newTab(browserContext);
  });

  after(async () => {
    await utilsPlaywright.closeBrowserContext(browserContext);
  });

  // Pre-condition: Get the number of products
  describe('PRE-TEST : Get the number of active products', async () => {
    it('should login in BO', async function () {
      await loginCommon.loginBO(this, page);
    });

    it('should go to \'Catalog > Products\' page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToProductsPage', baseContext);

      await boDashboardPage.goToSubMenu(
        page,
        boDashboardPage.catalogParentLink,
        boDashboardPage.productsLink,
      );
      await productsPage.closeSfToolBar(page);

      const pageTitle = await productsPage.getPageTitle(page);
      expect(pageTitle).to.contains(productsPage.pageTitle);
    });

    it('should filter by Active Status', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'getNumberOfActiveProducts', baseContext);

      const numberOfProducts = await productsPage.resetAndGetNumberOfLines(page);
      await productsPage.filterProducts(page, 'active', 'Yes', 'select');

      numberOfActiveProducts = await productsPage.getNumberOfProductsFromList(page);
      expect(numberOfActiveProducts).to.within(0, numberOfProducts);
    });
  });

  // Filter products by composition and  availability
  describe('Filter products list by Composition', async () => {
    it('should view my shop', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToShopFO', baseContext);

      // Click on view my shop
      page = await productSettingsPage.viewMyShop(page);
      await homePage.changeLanguage(page, 'en');

      const result = await homePage.isHomePage(page);
      expect(result).to.eq(true);
    });

    it('should go to all products page', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'goToAllProducts', baseContext);

      await homePage.changeLanguage(page, 'en');
      await homePage.goToAllProductsPage(page);

      const isCategoryPageVisible = await foClassicCategoryPage.isCategoryPage(page);
      expect(isCategoryPageVisible, 'Home category page was not opened').to.eq(true);
    });

    it('should filter products by composition \'Ceramic - Cotton - Recycled cardboard\'', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'filterByComposition', baseContext);

      await foClassicCategoryPage.filterByCheckbox(page, 'feature', 'Composition-Ceramic', true);
    });

    it('should check the active filters', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'getActiveFilters1', baseContext);

      const activeFilters = await foClassicCategoryPage.getActiveFilters(page);
      expect(activeFilters).to.contains('Composition: Ceramic');
    });

    it('should get the number of products', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'getNumberOfProducts4', baseContext);

      productsNumber = await foClassicCategoryPage.getNumberOfProducts(page);
      expect(productsNumber).to.be.above(1);
    });

    it('should close the active filter', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'closeActiveFilter', baseContext);

      await foClassicCategoryPage.closeFilter(page, 1);

      const isNotVisible = await foClassicCategoryPage.isActiveFilterNotVisible(page);
      expect(isNotVisible).to.eq(true);
    });

    it('should check the number of products', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'getNumberOfProducts1', baseContext);

      const productsNumberAfterClearFilter = await foClassicCategoryPage.getNumberOfProducts(page);
      expect(productsNumberAfterClearFilter).to.be.equal(numberOfActiveProducts);
    });
  });

  describe('Filter products list by Availability', async () => {
    it('should filter products by availability \'In Stock\'', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'filterByAvailability', baseContext);

      await foClassicCategoryPage.filterByCheckbox(page, 'availability', '\'Availability-In+stock\'', true);
    });

    it('should check the active filters', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'getActiveFilters2', baseContext);

      const activeFilters = await foClassicCategoryPage.getActiveFilters(page);
      expect(activeFilters).to.contains('Availability: In stock');
    });

    it('should close the active filter', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'closeActiveFilter2', baseContext);

      await foClassicCategoryPage.closeFilter(page, 1);

      const isNotVisible = await foClassicCategoryPage.isActiveFilterNotVisible(page);
      expect(isNotVisible).to.eq(true);
    });

    it('should check the number of products', async function () {
      await testContext.addContextItem(this, 'testIdentifier', 'getNumberOfProducts2', baseContext);

      const productsNumberAfterClearFilter = await foClassicCategoryPage.getNumberOfProducts(page);
      expect(productsNumberAfterClearFilter).to.be.equal(numberOfActiveProducts);
    });
  });
});
