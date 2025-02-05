export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-white">
      <h1 className="text-3xl font-bold text-center mb-6">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8 text-center">
        Last Updated: February 4, 2025
      </p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
        <p>
          These Terms of Use outline the terms and conditions under which you
          ("you" or "your") may access, interact with, or otherwise use the
          interfaces, features, and services provided by TheRugGame.fun ("the
          Company," "we," "us," or "our"). These Terms, together with our
          Privacy Policy and any additional policies expressly incorporated
          herein (collectively, the "Terms"), form a binding agreement between
          you and us.
        </p>
        <p>
          The Terms govern your use of (i) all content, information, and
          functionality provided on TheRugGame.fun (the "Site"), and (ii) the
          smart contract-based platform that allows users to place wagers on
          predictions regarding cryptocurrency projects (the "Platform").
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Notice</h2>
        <p className="mb-4">
          <strong>PLEASE READ THESE TERMS CAREFULLY.</strong> BY ACCESSING OR
          USING THE SITE OR PLATFORM, YOU AGREE TO BE BOUND BY THESE TERMS. IF
          YOU DO NOT AGREE, YOU MUST IMMEDIATELY CEASE USING THE SITE AND
          PLATFORM.
        </p>
        <p>
          <strong>Restricted Access:</strong> Use of the Site and Platform is
          strictly prohibited for individuals or entities in jurisdictions where
          such use is illegal or restricted. Any use of VPNs or similar tools to
          circumvent these restrictions is strictly prohibited. Violations of
          these Terms may result in the restriction of your wallet and account.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Description of the Platform</h2>
        <p>
          TheRugGame.fun enables users to participate in decentralized
          predictions on cryptocurrency projects. You can:
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>Place wagers on whether certain cryptocurrency projects will "pump" or "rug" within a specified timeframe.</li>
          <li>View real-time statistics, wager history, and leaderboards.</li>
        </ul>
        <p className="mt-4">
          The Platform relies on blockchain technology and self-hosted
          cryptocurrency wallets. Please note:
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>We do not have access to or control over your wallet, private keys, or cryptocurrency assets.</li>
          <li>All transactions on the Platform are immutable and irreversible.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Your Responsibilities</h2>
        <p>
          By using the Platform, you represent and warrant that:
        </p>
        <ul className="list-disc ml-6 mt-2">
          <li>You are at least 18 years old.</li>
          <li>
            You are not located in or a resident of any restricted jurisdiction,
            including but not limited to the United States, United Kingdom,
            France, Singapore, or any jurisdiction where the use of this
            Platform is illegal.
          </li>
          <li>
            You understand the risks associated with blockchain transactions,
            including market volatility, smart contract vulnerabilities, and
            transaction irreversibility.
          </li>
          <li>
            You will not use VPNs or similar tools to access the Platform from a
            restricted jurisdiction.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul className="list-disc ml-6 mt-2">
          <li>Violate any applicable laws or these Terms.</li>
          <li>Use the Platform for fraudulent or deceptive purposes.</li>
          <li>Use bots, automated tools, or data scraping methods to interact with the Site or Platform.</li>
          <li>Engage in any form of market manipulation, including spoofing or wash trading.</li>
          <li>
            Attempt to reverse engineer, disassemble, or tamper with the
            Platform or its underlying smart contracts.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Modifications to the Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. Updated Terms
          will be posted on the Site, and the "Last Updated" date will reflect
          the changes. Continued use of the Platform after any modifications
          constitutes your acceptance of the updated Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
        <p>
          For any questions or concerns, please contact us at{" "}
          <a
            href="mailto:support@theruggame.fun"
            className="text-blue-500 hover:underline"
          >
            support@theruggame.fun
          </a>
          .
        </p>
      </section>
    </div>
  );
}
