import type { CollectionAfterChangeHook } from 'payload'

import { sendSystemMail } from '@/email'
import { kitchenInbox } from '@/email/kitchen'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * The kitchen's copy of a form builder submission.
 *
 * A form dropped into a CMS page stores its answers in `form-submissions`, which
 * the admin already lists. This hook adds the knock on the shoulder: one email
 * with every answer, sent to the inbox the footer global owns. It runs only on
 * create, never on update, so editing a submission in the admin does not mail
 * the kitchen again. The submission is already written when this runs, so a
 * failed or skipped send is only logged and never fails the form.
 */

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type SubmissionRow = { field?: string; value?: string }

export const emailFormSubmission: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return doc

  const payload = req.payload

  try {
    const to = await kitchenInbox(payload)

    if (!to) {
      payload.logger.warn({ msg: 'form_submission_no_recipient', submission: doc.id })
      return doc
    }

    const rows = (doc.submissionData ?? []) as SubmissionRow[]

    // The relationship may arrive populated or as a bare id, depending on depth.
    const form = doc.form as { id?: unknown; title?: string } | number | string | undefined
    const formId = typeof form === 'object' && form ? form.id : form
    let formTitle = typeof form === 'object' && form ? form.title : undefined

    if (!formTitle && formId) {
      try {
        const formDoc = await payload.findByID({
          collection: 'forms',
          depth: 0,
          id: formId as number | string,
          overrideAccess: true,
        })
        formTitle = formDoc?.title
      } catch {
        // A missing form should not stop the notice; the answers still matter.
      }
    }

    const replyTo = rows
      .map((row) => String(row.value ?? '').trim())
      .find((value) => EMAIL_SHAPE.test(value))

    const subject = `New form submission: ${formTitle || 'website form'}`
    const adminUrl = `${getServerSideURL()}/admin/collections/form-submissions/${doc.id}`
    const lines = rows.map((row) => `${row.field ?? 'Field'}: ${row.value ?? ''}`)

    const text = [
      `A new form submission arrived for "${formTitle || 'a website form'}".`,
      '',
      ...lines,
      '',
      'Open the submission in the admin:',
      adminUrl,
    ].join('\n')

    const html = [
      `<p>A new form submission arrived for "${escapeHtml(formTitle || 'a website form')}".</p>`,
      '<ul>',
      ...rows.map(
        (row) =>
          `<li><strong>${escapeHtml(row.field ?? 'Field')}:</strong> ${escapeHtml(row.value ?? '').replace(/\n/g, '<br/>')}</li>`,
      ),
      '</ul>',
      `<p><a href="${escapeHtml(adminUrl)}">Open the submission in the admin</a></p>`,
    ].join('')

    const result = await sendSystemMail(payload, { html, replyTo, subject, text, to })

    if (result.status === 'failed') {
      payload.logger.error({ msg: 'form_submission_notice_failed', status: result.status })
    } else if (result.status === 'skipped') {
      payload.logger.warn({ msg: 'form_submission_notice_skipped' })
    }
  } catch {
    payload.logger.error({ msg: 'form_submission_notice_error' })
  }

  return doc
}
