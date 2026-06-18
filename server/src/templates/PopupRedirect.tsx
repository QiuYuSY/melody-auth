import { html } from 'hono/html'
import { oauthDto } from 'dtos'

const PopupRedirect = ({
  queryDto, code,
}: {
  queryDto: oauthDto.GetAuthorizeDto;
  code: string;
}) => {
  const redirectOrigin = new URL(queryDto.redirectUri).origin

  return (
    <html>
      <body>
        <section>
          <div />
          {html`
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  state: "${queryDto.state}",
                  code: "${code}",
                  locale: "${queryDto.locale}",
                  org: "${queryDto.org ?? ''}",
                  redirectUri: "${queryDto.redirectUri}",
                }, "${redirectOrigin}");
              }
            </script>
          `}
        </section>
      </body>
    </html>
  )
}

export default PopupRedirect
