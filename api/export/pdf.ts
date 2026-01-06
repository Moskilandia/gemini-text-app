import { NextApiRequest, NextApiResponse } from "next";
import { formatCopyBlock } from "../src/formatCopyBlock";
import pdf from "pdfkit";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
              // Audit log: model fallback used
              try {
                const { logAuditEvent } = await import("../../shared/audit.ts");
                await logAuditEvent({
                  orgId,
                  userId,
                  actionType: "model.fallback.used",
                  metadata: {
                    attempted: ["gpt-5.2"],
                    used: "gpt-5.1",
                  },
                });
              } catch (e) {
                // Optionally log audit failure, but do not block export
                console.error("Audit log failed", e);
              }
          // Audit log: reasoning completed
          try {
            const { logAuditEvent } = await import("../../shared/audit.ts");
            const { getReasonlyModel } = await import("../src/getReasonlyModel");
            await logAuditEvent({
              orgId,
              userId,
              actionType: "reasoning.completed",
              metadata: {
                model: getReasonlyModel(),
                tier: req.body?.tier,
                domain: req.body?.domainContext,
              },
            });
          } catch (e) {
            // Optionally log audit failure, but do not block export
            console.error("Audit log failed", e);
          }
      // Audit log: template used (ops)
      try {
        const { logAuditEvent } = await import("../../shared/audit.ts");
        await logAuditEvent({
          orgId,
          userId,
          actionType: "template.used.ops",
        });
      } catch (e) {
        // Optionally log audit failure, but do not block export
        console.error("Audit log failed", e);
      }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
      const { text, messageId, orgId, userId } = req.body;
      if (!text) {
        res.status(400).json({ error: "Missing text" });
        return;
      }

      // Audit log: export generated pdf
      try {
        const { logAuditEvent } = await import("../../shared/audit.ts");
        await logAuditEvent({
          orgId,
          userId,
          actionType: "export.generated.pdf",
          metadata: { messageId },
        });
        // Audit log: export generated case bundle
        await logAuditEvent({
          orgId,
          userId,
          actionType: "export.generated.case_bundle",
          metadata: { messageId },
        });
        // Audit log: reasoning used (ops)
        if (req.body && req.body.tier) {
          await logAuditEvent({
            orgId,
            userId,
            actionType: `reasoning.used.${req.body.tier}`,
            metadata: {
              domain: "ops",
            },
          });
        }
      } catch (e) {
        // Optionally log audit failure, but do not block export
        console.error("Audit log failed", e);
      }

      const doc = new pdf();
      let chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=export.pdf");
        res.send(pdfBuffer);
      });

      doc.text(formatCopyBlock(text));
      doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
