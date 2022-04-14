import React, { useEffect, useState, useRef } from 'react';
import { Row, Container, Button, Form, Col, Alert } from 'react-bootstrap'
import './check-eligibility.css';
import { useMachine } from '@xstate/react'
import { machine } from '../../machines/checkEligibility';
import Info from '../info/info';
import Spinner from '../spinner/spinner';
import { io } from 'socket.io-client';
import scenarios from './scenarios.json';
import { get as _get, find as _find } from 'lodash-es'
import Table from '../table/table';
import { useHistory } from "react-router-dom";

const socket = io();
// const socket = io('http://localhost:8000'); //local

const EligibilityCheck = props => {
    const [current, send] = useMachine(machine);
    const [validated, setValidated] = useState(false);
    const history = useHistory();

    const handleSubmit = (event) => {
        event.preventDefault();
        const form = event.currentTarget;

        if (form.checkValidity() === false) {
            event.stopPropagation();
            setValidated(true);
            return;
        }

        const { policyId, scenario, name, gender } = form.elements;
        const index = parseInt(scenario.value);
        const scenarioObject = _find(scenarios, { index });
        const payload = {
            requestType: event.nativeEvent.submitter.dataset.type,
            payload: {
                policyId: policyId.value,
                name: `${name.value}`,
                gender: gender.value,
                ...(scenarioObject && {
                    ...scenarioObject.body
                })
            }
        };
        send('SUBMIT', payload);
    };

    const formatErrorResponse = (payload) => {
        const { responseTime = 0, error = {} } = payload;
        return {
            error: error?.message,
            responseTime: `${responseTime / 1000} seconds`
        }
    };

    const formatSuccessResponse = (payload) => {
        const { responseTime = 0, entry = [] } = payload;
        const errorDetails = payload['x-hcx-error_details'];
        const patientDetails = _find(entry, e => e?.resource?.resourceType === 'Patient');
        const coverageEligibilityResponse = _find(entry, e => e?.resource?.resourceType === 'CoverageEligibilityResponse');
        const claimResponse = _find(entry, e => e?.resource?.resourceType === 'ClaimResponse');

        const policyIdElement = document.getElementById('policyId');
        return {
            ...(patientDetails && {
                gender: _get(patientDetails, 'resource.gender'),
            }),
            ...(coverageEligibilityResponse && {
                name: _get(coverageEligibilityResponse, 'resource.patient.display'),
                status: _get(coverageEligibilityResponse, 'resource.status'),
                policyId: policyIdElement?.value,
                policyStart: _get(coverageEligibilityResponse, 'resource.servicedPeriod.start'),
                policyEnd: _get(coverageEligibilityResponse, 'resource.servicedPeriod.end'),
            }),
            ...(claimResponse && {
                name: _get(claimResponse, 'resource.subject.display'),
                policyId: policyIdElement?.value
            }),
            ...(errorDetails && {
                error: errorDetails?.message
            }),
            responseTime: `${responseTime / 1000} seconds`
        }
    };


    useEffect(() => {
        socket.on('acknowledgement', response => {
            console.log({ response });
            current.value === 'acknowledged' && send('ACKNOWLEDGEMENT_SUCCESS', { payload: response });
        })
    });

    return (
        <>
            <Container>
                <Row>
                    <Col className='m-3' >
                        <Form noValidate validated={validated} onSubmit={handleSubmit} id="hcx-form">
                            <Alert variant='dark'> Patient Details</Alert>

                            <Row className="mb-3">
                                <Form.Group as={Col}>
                                    <Form.Label>Patient Policy Id</Form.Label>
                                    <Form.Control name="policyId" type="text" placeholder="Policy Id" required id='policyId' />
                                    <Form.Control.Feedback type="invalid" >
                                        Please enter the Policy Id
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group as={Col}>
                                    <Form.Label>Scenarios</Form.Label>
                                    <Form.Select name='scenario' required>
                                        {
                                            scenarios.map((scenario) => {
                                                const { index, label, selected = false } = scenario;
                                                return <option value={index} selected={selected} key={index}> {label}</option>
                                            })
                                        }
                                    </Form.Select>

                                    <Form.Control.Feedback type="invalid">
                                        Please select a scenario from the list.
                                    </Form.Control.Feedback>
                                </Form.Group>
                            </Row>

                            <Row className="mb-3">
                                <Form.Group as={Col}>
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control name="name" type="text" placeholder="Name" required />
                                    <Form.Control.Feedback type="invalid">
                                        Name is required
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group as={Col}>
                                    <Form.Label className='mb-3'>Gender</Form.Label>
                                    <div className="mb-3">
                                        <Form.Check
                                            inline
                                            label="Male"
                                            name="gender"
                                            type="radio"
                                            value="Male"
                                            required
                                        />
                                        <Form.Check
                                            inline
                                            label="Female"
                                            name="gender"
                                            type="radio"
                                            value="Female"
                                            required
                                        />
                                    </div>
                                </Form.Group>

                            </Row>

                            {current.value === 'initial' && <Button variant="primary" type="submit" className='m-2' data-type="ELIGIBILITY" form='hcx-form' value="CLAIM"> Check eligibility </Button>}
                            {/* {current.value === 'resolved' && !current.context?.hcxResponse['x-hcx-error_details'] && <Button variant="primary" type="submit" data-type="CLAIM" form="hcx-form" value="CLAIM"> Claim </Button>} */}
                            {current.value === 'initial' && <Button variant="primary" type="submit" className='m-2' data-type="CLAIM" form="hcx-form" value="CLAIM"> Claim </Button>}
                            {current.value === 'initial' && <Button variant="primary" type="submit" className='m-2' data-type="CLAIM" form="hcx-form" value="CLAIM"> Pre Auth </Button>}

                            {['resolved', 'rejected'].includes(current.value) && <>
                                <Button variant="primary" type="button" onClick={e => send('RETRY')} className="m-2"> RETRY </Button>
                                <Button variant="primary" type="button" className="m-2" onClick={e => history.push({ pathname: '/json-viewer', state: current.context.hcxResponse || current.context.error })}> Complete Response  </Button>
                                {current.context?.request && <Button variant="primary" type="button" className="m-2" onClick={e => history.push({ pathname: '/json-viewer', state: current.context.request })}> Complete Request  </Button>}
                            </>}

                            {current.value === 'loading' && <Spinner message={current.context.message} />}
                            {current.value === 'acknowledged' && <Spinner message={current.context.message} />}

                        </Form>
                    </Col>
                </Row>
                <Row>
                    <Col className='m-3' >
                        {current.value === 'rejected' && <Info type='danger' heading="Error !!" body={current.context?.error?.error?.message || current.context.message} />}
                        {current.value === 'resolved' && <Info type='success' heading="Success !!" body={current.context.message} footer={formatSuccessResponse({ ...current?.context?.hcxResponse, responseTime: current.context.timeTakenForResponse })} />}

                        {/* show error in tabluar format */}
                        {current.value === 'rejected' && <Table data={formatErrorResponse({ ...current.context.error, responseTime: current.context.timeTakenForResponse })}></Table>}
                        {current.value === 'resolved' && <Table data={formatSuccessResponse({ ...current?.context?.hcxResponse, responseTime: current.context.timeTakenForResponse })}></Table>}
                    </Col>
                </Row>
            </Container>
        </>
    );
}

export { EligibilityCheck }