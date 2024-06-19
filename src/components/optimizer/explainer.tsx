import React from 'react';
import { Accordion } from 'semantic-ui-react';
import { GlobalContext } from '../../context/globalcontext';



export const CiteOptExplainer = () => {

    const { t } = React.useContext(GlobalContext).localized;

    return (
        <>
            <Accordion
                defaultActiveIndex={-1}
                panels={[
                    {
                        index: 0,
                        key: 0,
                        title: t('cite_opt.ev_explainer.title'),
                        content: {
                            content: (
                                <div>
                                    {/* <h3>Explanation</h3> */}
                                    <p>
                                        {t('cite_opt.ev_explainer.para_1')}
                                    </p>
                                    <p>
                                        {t('cite_opt.ev_explainer.para_2')}
                                    </p>
                                    <p>
                                        {t('cite_opt.ev_explainer.para_3')}
                                    </p>
                                    <p>
                                        {t('cite_opt.ev_explainer.para_4')}
                                    </p>
                                </div>
                            )
                        }
                    }
                ]}
            />
        </>
    )
}