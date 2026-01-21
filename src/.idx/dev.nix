{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
  ];

  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "bradlc.vscode-tailwindcss",
      "googlecloudtools.genkit-vscode"
    ];

    # Enable previews
    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev"];
          manager = "web";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };

    # Workspace lifecycle hooks
    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        npm-install = "npm install && (cd functions && npm install)";
        setup-env = ''
          echo "NEXT_PUBLIC_TURNSTILE_SITE_KEY=" > .env
          echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=" >> .env
          echo "NEXT_PUBLIC_APP_URL=https://wodburner.app" >> .env
          
          echo "STRIPE_SECRET_KEY=" > functions/.env
          echo "STRIPE_WEBHOOK_SECRET=" >> functions/.env
          echo "BREVO_API_KEY=" >> functions/.env
          echo "STRIPE_MONTHLY_PRICE_ID=" >> functions/.env
          echo "STRIPE_YEARLY_PRICE_ID=" >> functions/.env
          echo "TURNSTILE_SECRET_KEY=" >> functions/.env
          echo "GEMINI_API_KEY=" >> functions/.env
        '';
      };
      # Runs when the workspace is (re)started
      onStart = {
        # The web preview command handles starting the dev server
      };
    };
  };
}
