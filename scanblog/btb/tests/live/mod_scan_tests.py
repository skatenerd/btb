import os
import time

from django.conf import settings
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import StaleElementReferenceException
from .base import BtbLiveServerTestCase, NoSuchElementException

from scanning.models import Scan, PendingScan, Document
from django.contrib.auth.models import User


class TestModScans(BtbLiveServerTestCase):
    def test_process_scan_with_pending(self):
        # NOTE: This one is a might lengthy; but it's easier than mocking.
        # Might be better refactored into 2 or 3 separate tests.
        assert Scan.objects.count() == 0
        assert PendingScan.objects.count() == 0
        assert User.objects.filter(pk=104).count() == 1
        b = self.selenium

        self.sign_in("testmod", "testmod")

        # Add a pending scan.
        b.get(self.url("/moderation/#/pending"))
        self.css(".user-chooser-trigger").send_keys("T")
        time.sleep(0.5)
        self.css(".user-search").send_keys("est Author")
        self.wait(lambda b: "Test Author" in self.css(".name-and-details").text)
        time.sleep(0.5)
        self.css(".name-and-details").click()
        self.wait(lambda b: "Test Author" in self.css(".pending-scan-list .display-name").text)
        pk = int(self.css(".user-id-raw").get_attribute("value"))
        scan_code = self.css(".reply-code").text

        # Upload a scan for it.
        self._upload_test_post("ex-post-prof-license.pdf", 7)

        # Apply the scan code.
        self.css(".choose-code input").send_keys(scan_code)
        self.css(".choose-code input").send_keys(Keys.ENTER)
        self.css("h1").click() # arbitrary element to click to simulate 'blur'
        self.wait(lambda b: self.css(".user-name").text == "Test Author")

        self._classify_pages(
                ["ignore", "post", "post", "profile", "profile", "license", "license"]
        )
        self._save_split()

        #
        # Edit the documents
        #
        self.css(".switch-to-edit-documents").click()
        self.wait(lambda b: len(self.csss(".edit-document")) == 3)

        doc_el = self.csss(".edit-document")[0]
        pk1 = int(doc_el.get_attribute("data-document-id"))
        self.css("input.doc-title", doc_el).send_keys("My Nature")
        self.css(".smartTextBox input", doc_el).send_keys("prison life, inmate rights,")
        self.css("select.doc-status", doc_el).send_keys("published")
        # Try to save; will fail with error, as we have no highlight selected.
        self.css(".save-doc", doc_el).click()
        self.wait(lambda b: len(self.csss(".error", doc_el)) > 0)

        self.assertEquals(Document.objects.get(pk=pk1).status, "unknown")

        # Set the highlight, then save again.
        canvas = self.css("canvas.page-image", doc_el)
        chain = ActionChains(b)
        chain.move_to_element_with_offset(canvas, 20, 20)
        chain.click_and_hold(None)
        chain.move_by_offset(300, 100)
        #chain.release(None) # HACK -- remove release to make it work with recent FF.
        chain.perform()

        self.css(".save-doc", doc_el).click()
        self.wait(lambda b: len(self.csss(".error")) == 0)
        self.assertEquals(Document.objects.get(pk=pk1).status, "published")

        # Save document 2.
        doc_el = self.csss(".edit-document")[1]
        pk2 = int(doc_el.get_attribute("data-document-id"))
        self.css("select.doc-status", doc_el).send_keys("published")
        self.css(".save-doc", doc_el).click()
        self.wait(lambda b: Document.objects.get(pk=pk2).status == "published")
        time.sleep(0.5) #ugh

        # Verify pages.
        b.get(self.url("/blogs/"))
        time.sleep(0.5)
        self.assertTrue("My Nature" in self.css("h2").text)

        b.get(self.url(
            User.objects.get(username="testauthor").profile.get_absolute_url()
        ))
        time.sleep(0.5)
        self.assertTrue("Test Author" in b.title)

    def _upload_test_post(self, filename, num_pages):
        b = self.selenium
        b.get(self.url("/scanning/add"))
        self.css("#id_file").send_keys(os.path.join(
            settings.MEDIA_ROOT, "test", "src", filename
        ))
        self.css(".upload-submit").submit()
        self.wait(lambda b: not b.current_url.startswith(self.url("/scanning/add")))
        while b.current_url.startswith(self.url("/moderation/wait")):
            try:
                el = self.css(".error")
                assert False, el.text
            except NoSuchElementException:
                time.sleep(1)
        self.wait(lambda b: b.current_url.startswith(self.url("/moderation/#/process/scan")))
        self.wait(lambda b: len(self.csss(".page-image")) == num_pages)

    def _classify_pages(self, page_types):
        for i, ptype in enumerate(page_types):
            self.css(".pagestatus.page-%s" % i).click()
            time.sleep(0.1)
            choices = {}
            for el in self.csss(".page-type-choice"):
                if ptype in el.text.strip():
                    el.click()
                    break
            else:
                self.fail("Can't find type '%s'" % hsh['type'])

    def _save_split(self):
        self.css(".save").click()
        try:
            self.wait(lambda b: "disabled" not in self.css(".switch-to-edit-documents").get_attribute("class"))
        except StaleElementReferenceException:
            pass

    def test_reclassify_page(self):
        """
        Test a bug where swapping the first page of two different docs caused
        integrity error.
        """
        b = self.selenium

        self.sign_in("testmod", "testmod")
        self._upload_test_post("ex-prof-posts.pdf", 6)
        self.css(".user-chooser-trigger").send_keys("T")
        time.sleep(0.5)
        self.css("input.user-search").send_keys("est Author")
        self.wait(lambda b: self.css(".user-chooser .display-name").text == "Test Author")
        self.css(".user-chooser .display-name").click()
        self._classify_pages(["ignore", "post", "profile", "ignore", "ignore", "ignore"])
        self._save_split()
        self.wait(lambda b: len(self.csss(".post-save-message.success")) > 0)
        self._classify_pages(["ignore", "ignore", "ignore", "ignore", "ignore", "ignore"])
        self._classify_pages(["ignore", "profile", "post", "ignore", "ignore", "ignore"])
        self._save_split()
        self.wait(lambda b: len(self.csss(".post-save-message.success")) > 0)
